import { Context } from "koa";
import * as Router from "koa-router";
import HttpError from "../lib/HttpError";
import logger from "../lib/Logger";
import config from "../lib/Config";
import * as querystring from "querystring";
const axios = require("axios");
import * as _ from "lodash";
import * as crypto from "crypto";

const router = new Router({ prefix: "/iiif/search" });

const RESPONSE_TEMPLATE_MANIFEST = {
  "@context": [
    "https://iiif.io/api/presentation/3/context.json",
    "https://iiif.io/api/search/1/context.json",
  ],
  "@id": "",
  "@type": "sc:AnnotationList",
  within: {
    "@type": "sc:Layer",
    total: 0,
    ignored: [] as any,
  },
  resources: [] as any,
  hits: [] as any,
};

const RESPONSE_TEMPLATE_COLLECTION = {
  "@context": "http://iiif.io/api/search/2/context.json",
  id: "",
  type: "AnnotationPage",
  ignored: [] as any,
  partOf: {
    id: "",
    type: "AnnotationCollection",
    total: 0,
    first: {
      id: "",
      type: "AnnotationPage",
    },
    last: {
      id: "",
      type: "AnnotationPage",
    },
  },
  prev: {
    id: "",
    type: "AnnotationPage",
  } as any,
  next: {
    id: "",
    type: "AnnotationPage",
  } as any,
  items: [] as any,
};

// Route handlers
router.get("/manifest/:id", async (ctx) => handleManifestSearch(ctx));
router.get("/collection/:id", async (ctx) => handleCollectionSearch(ctx));
router.get("/collection/:id/raw", async (ctx) =>
  handleCollectionSearch(ctx, true)
);

// Helper functions
async function handleManifestSearch(ctx: Context) {
  logger.info(
    `Received a search request for manifest with ID: ${ctx.params.id}`
  );
  const id = ctx.params.id;
  const { q, ...ignored } = normalizeQueryParams(ctx.request.query);
  const fq = id ? `source:${id}` : "*:*";

  const solrParams = createSolrParams(q, fq);
  const response = await querySolr(solrParams);
  const preprocessedResponse = preprocessManifestResponse(response);
  const iiifResponse = generateIIIFManifestResponse(
    preprocessedResponse,
    Object.keys(ignored),
    id,
    q
  );

  ctx.body = JSON.stringify(iiifResponse);
  ctx.set("Content-Type", "application/json");
}

async function handleCollectionSearch(ctx: Context, raw = false) {
  logger.info(`Received a collection search request for ${ctx.params.id}`);
  const id = ctx.params.id;
  const {
    q,
    page = 0,
    rows = config.solr!.maxRows,
    ...ignored
  } = normalizeQueryParams(ctx.request.query);
  const solrParams = createCollectionSolrParams(
    id,
    q,
    Number(rows),
    Number(page)
  );
  const response = await querySolr(solrParams);
  const iiifResponse = generateIIIFCollectionResponse(
    response,
    Object.keys(ignored),
    id,
    q,
    Number(page),
    Number(rows)
  );

  // ctx.body = JSON.stringify(response);
  ctx.body = JSON.stringify(raw ? response : iiifResponse);
  ctx.set("Content-Type", "application/json");
}

function createSolrParams(query: string, fq: string) {
  return {
    q: query,
    df: "ocr_text",
    fq,
    rows: 500,
    hl: "on",
    "hl.ocr.fl": "ocr_text",
    "hl.ocr.absoluteHighlights": "on",
    "hl.snippets": 4096,
    "hl.weightMatches": "true",
  };
}

function createCollectionSolrParams(
  id: string,
  q: string,
  rows: number,
  page = 0
) {
  return {
    q: `(${q}) AND source:${id}*`,
    df: "ocr_text",
    hl: "true",
    "hl.ocr.fl": "ocr_text",
    "hl.ocr.contextBlock": "line",
    "hl.ocr.contextSize": "1",
    "hl.snippets": "1",
    group: "true",
    "group.field": "source",
    "group.sort": "id asc",
    "group.limit": "1",
    "group.format": "simple",
    "group.ngroups": "true",
    rows,
    start: page * rows,
  };
}

async function querySolr(params: any): Promise<any> {
  const solrUrl = buildSolrUrl(params);
  logger.debug("solrUrl: " + solrUrl);

  try {
    const response = await axios.get(solrUrl);
    return response.data;
  } catch (error) {
    logger.error("Error in Solr query: ", error);
    throw new HttpError(500, "Error querying Solr");
  }
}

function buildSolrUrl(params: any) {
  const solrBase = `http://${config.solr!.host}:${config.solr!.port}/solr/${
    config.solr!.core
  }`;
  return `${solrBase}/select?${querystring.stringify(params)}`;
}

function preprocessManifestResponse(response: any) {
  let out = {
    numTotal: 0,
    snippets: [] as any,
  };
  try {
    const ocrHighlighting = response.ocrHighlighting,
      docs: any[] = response.response.docs;

    _.forIn(ocrHighlighting, function (document: any, documentId: string) {
      const doc = docs.find((d) => d.id === documentId);
      _.each(document.ocr_text.snippets, function (snippet: any) {
        snippet.documentId = documentId;
        snippet.collectionId = doc.source;
        snippet.imageUrl = doc.image_url;
        out.snippets.push(snippet);
      });
      out.numTotal += document.ocr_text.numTotal;
    });
  } catch (error) {
    logger.error("Error", error as any);
  }
  return out;
}

function generateIIIFManifestResponse(
  solrResponse: any,
  ignoredFields: any[],
  volId: string,
  query: string
) {
  let doc = _.cloneDeep(RESPONSE_TEMPLATE_MANIFEST);

  doc["@id"] = config.manifestSearchUrl + "/" + volId + "?q=" + query;
  doc.within.total = solrResponse["numTotal"];
  doc.within.ignored = ignoredFields;

  _.each(solrResponse.snippets, function (snippet: any, idx: number) {
    const match = snippet.text.match(/<em>(.+?)<\/em>/),
      text = match[1],
      before = snippet.text.substr(0, match.index),
      after = snippet.text.substr(match.index + match[0].length);

    _.each(snippet.highlights, function (highlight: any) {
      let annoIds: string[] = [];

      _.each(highlight, function (highlightBox: any) {
        const ident =
            config.manifestServerUrl +
            "/" +
            snippet.documentId +
            "/annotation/" +
            crypto.randomBytes(16).toString("hex"),
          x = highlightBox.ulx,
          y = highlightBox.uly,
          w = highlightBox.lrx - highlightBox.ulx,
          h = highlightBox.lry - highlightBox.uly;

        annoIds.push(ident);

        doc.resources.push({
          "@id": ident,
          "@type": "oa:Annotation",
          motivation: "sc:painting",
          resource: {
            "@type": "cnt:ContentAsText",
            chars: highlightBox.text,
          },
          on:
            config.imageServerUrl +
            "/iiif/2/" +
            snippet.imageUrl +
            "#xywh=" +
            x +
            "," +
            y +
            "," +
            w +
            "," +
            h,
        });
      });

      doc.hits.push({
        "@type": "search:Hit",
        annotations: annoIds,
        match: text,
        before: before,
        after: after,
      });
    });
  });

  return doc;
}

function generateIIIFCollectionResponse(
  solrResponse: any,
  ignoredFields: any[],
  volId: string,
  query: string,
  page: number,
  rows: number
) {
  let doc = _.cloneDeep(RESPONSE_TEMPLATE_COLLECTION);
  let items = [] as any;
  const total = solrResponse.grouped.source.ngroups;
  const last = Math.floor(Math.abs((total - 1) / rows));

  doc.id = `${config.collectionSearchUrl}/${volId}?q=${query}${
    page > 0 ? `&page=${page}` : ""
  }`;
  doc.ignored = ignoredFields;
  doc.partOf.id = `${config.collectionSearchUrl}/${volId}?q=${query}`;
  doc.partOf.total = total;
  doc.partOf.first.id = `${config.collectionSearchUrl}/${volId}?q=${query}`;
  doc.partOf.last.id = `${config.collectionSearchUrl}/${volId}?q=${query}&page=${last}`;

  if (page > 0) {
    doc.prev.id = `${config.collectionSearchUrl}/${volId}?q=${query}&page=${
      page - 1
    }`;
  } else {
    delete doc.prev;
  }
  if (page < last) {
    doc.next.id = `${config.collectionSearchUrl}/${volId}?q=${query}&page=${
      page + 1
    }`;
  } else {
    delete doc.next;
  }

  _.each(solrResponse.grouped.source.doclist.docs, function (doc: any) {
    const randomBytes = crypto.randomBytes(16).toString("hex");
    const snippet = solrResponse.ocrHighlighting[doc.id].ocr_text.snippets[0];
    const x = snippet.highlights[0][0].ulx;
    const y = snippet.highlights[0][0].uly;
    const w = snippet.highlights[0][0].lrx - snippet.highlights[0][0].ulx;
    const h = snippet.highlights[0][0].lry - snippet.highlights[0][0].uly;

    const item = {
      id: `${config.imageServerUrl}/iiif/2/${doc.id}/annotation/${randomBytes}`,
      type: "Annotation",
      motivation: "highlighting",
      body: {
        type: "TextualBody",
        value: snippet.text,
        format: "text/html",
      },
      target: {
        id: `${config.imageServerUrl}/iiif/2/${doc.image_url}#xywh=${x},${y},${w},${h}`,
        partOf: {
          id: `${doc.manifest_path || ""}`,
          type: "Manifest",
          label: {
            en: [doc.manifest_label || ""],
          },
        },
      },
    };
    items.push(item);
  });
  doc.items = items;

  return doc;
}

function normalizeQueryParams(query: querystring.ParsedUrlQuery): {
  [key: string]: string;
} {
  const normalizedParams: { [key: string]: string } = {};

  for (const key in query) {
    const value = query[key];
    if (Array.isArray(value)) {
      normalizedParams[key] = value[value.length - 1];
    } else if (typeof value === "string") {
      normalizedParams[key] = value;
    } else {
      throw new Error("Unexpected value type");
    }
  }

  return normalizedParams;
}

export default router;
