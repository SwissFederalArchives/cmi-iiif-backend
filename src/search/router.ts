import {Context} from 'koa';
import * as Router from 'koa-router';

import HttpError from '../lib/HttpError';
import logger from '../lib/Logger';
import config from '../lib/Config';
import uuid = require("uuid");
const axios = require('axios');
import * as _ from "lodash";
import * as querystring from "querystring";
import * as crypto from "crypto";

const router = new Router({prefix: '/iiif/search'}),
EM_PATTERN = new RegExp("<em>(.+?)</em>"),
RESPONSE_TEMPLATE = {
"@context":[
"https://iiif.io/api/presentation/3/context.json",
"https://iiif.io/api/search/1/context.json"
],
"@id": '',
"@type":"sc:AnnotationList",

"within": {
"@type": "sc:Layer",
"total": 0,
"ignored": [] as any
},

"resources": [] as any,
"hits": [] as any
};

router.get('/manifest/:id', async ctx => {
    logger.info(`Received a search request for ${ctx.params.id}`);

    ctx.body = JSON.stringify(await search(ctx, ctx.params.id));
    ctx.set('Content-Type', 'application/json');

    logger.info(`Sending a IIIF collection with id ${ctx.params.id}`);
});

router.get('/solr/', async ctx => {
    logger.info(`Received a solr request`);

    const solrBase = `http://${config.solr!.host}:${config.solr!.port}/solr/${config.solr!.core}`,
        solrUrl = solrBase + "/select?" + ctx.querystring;

    try {
        logger.info(`${solrUrl}`);
        const response = await axios.get(solrUrl);

        ctx.body = response.data;
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        logger.error('Error', error as any);
        ctx.body = '{error: ' + (error as any) + '}';
    }
});

async function search(ctx: Context, docId: string) : Promise<object> {
    const query = ctx.request.query.q,
        fq = docId ? `source:${docId}` : '*:*',
        response = await querySolr(query as string, fq);

    logger.debug('query: ' + query + ', docid: ' + docId);

    let ignoredParams : any[] = [];
    return makeResponse(response, ignoredParams, docId, query as string);
}

async function querySolr(query: string, fq: string) : Promise<object> {
    const params = {
        'q': query,
        'df': 'ocr_text',
        'fq': fq,
        'rows': 500,
        'hl': 'on',
        'hl.ocr.fl': 'ocr_text',
        'hl.ocr.absoluteHighlights': 'on',
        'hl.snippets': 4096,
        'hl.weightMatches': 'true',
    };

    let out = {
        'numTotal': 0,
        'snippets': [] as any
    },
    solrBase = `http://${config.solr!.host}:${config.solr!.port}/solr/${config.solr!.core}`,
    solrUrl = solrBase + "/select?" + querystring.stringify(params);
    logger.debug('solrUrl: ' + solrUrl);

    try {
        const response = await axios.get(solrUrl),
            ocrHighlighting = response.data.ocrHighlighting,
            docs:any[] = response.data.response.docs;

        _.forIn(ocrHighlighting, function (document: any, documentId: string) {

            const doc = docs.find(d => d.id === documentId );
            _.each(document.ocr_text.snippets, function (snippet: any) {
                snippet.documentId = documentId;
                snippet.collectionId = doc.source;
                snippet.imageUrl = doc.image_url;
                out.snippets.push(snippet);
            });
            out.numTotal += document.ocr_text.numTotal;
        });

    } catch (error) {
        logger.error('Error', error as any);
    }

    return out;
}

async function makeResponse(hlresp: any, ignored_fields: any[], volId: string, query: string) : Promise<object> {
    let doc = _.cloneDeep(RESPONSE_TEMPLATE);

    doc['@id'] = config.manifestSearchUrl + '/' + volId + '?q=' + query;
    doc.within.total = hlresp['numTotal'];
    doc.within.ignored = ignored_fields;

    _.each(hlresp.snippets, function (snippet: any, idx: number){
        const match = snippet.text.match(EM_PATTERN),
            text = match[1],
            before = snippet.text.substr(0, match.index),
            after = snippet.text.substr(match.index + match[0].length);

        _.each(snippet.highlights, function (highlight:any) {
            let annoIds: string[] = [];

            _.each(highlight, function (highlightBox:any) {
                const ident = config.manifestSearchUrl  + '/' + snippet.documentId + '/annotation/' +crypto.randomBytes(16).toString("hex"),
                    x = highlightBox.ulx,
                    y = highlightBox.uly,
                    w = highlightBox.lrx - highlightBox.ulx,
                    h = highlightBox.lry - highlightBox.uly;

                annoIds.push(ident);

                doc.resources.push({
                    "@id": ident,
                    "@type": "oa:Annotation",
                    "motivation": "sc:painting",
                    "resource": {
                        "@type": "cnt:ContentAsText",
                        "chars": highlightBox.text
                    },
                    "on": config.imageServerUrl + '/iiif/2/' + snippet.imageUrl + '#xywh=' + x + ',' + y + ',' + w + ','+ h
                });
            });

            doc.hits.push({
                '@type': 'search:Hit',
                'annotations': annoIds,
                'match': text,
                'before': before,
                'after': after,
            });
        });
    });

    return doc;
}

export default router;