require("dotenv").config();

export interface Config {
  env?: string;
  services: string[];
  secret: string;
  accessToken: string;
  port: number;
  manifestServerUrl?: string;
  manifestSearchUrl?: string;
  collectionSearchUrl?: string;
  imageServerUrl?: string;
  logLevel: string;
  baseUrl: string;
  loginDisabled: boolean;
  solr: null | {
    host: string;
    port: number;
    delay: number;
    core: string;
    maxRows: number;
  };
}

const config: Config = {
  env: process.env.NODE_ENV,
  imageServerUrl: process.env.IIIF_SERVER_IMAGE_SERVER_URL,
  manifestServerUrl: process.env.IIIF_SERVER_MANIFEST_SERVER_URL,
  manifestSearchUrl: process.env.IIIF_SERVER_MANIFEST_SEARCH_URL,
  collectionSearchUrl: process.env.IIIF_SERVER_COLLECTION_SEARCH_URL,

  services: (() => {
    if (
      !process.env.IIIF_SERVER_SERVICES ||
      process.env.IIIF_SERVER_SERVICES === "null"
    )
      throw new Error("Services to run are not defined");
    return process.env.IIIF_SERVER_SERVICES.split(",");
  })(),

  secret: (() => {
    if (
      !process.env.IIIF_SERVER_SECRET ||
      process.env.IIIF_SERVER_SECRET === "null"
    )
      throw new Error("Secret is not defined");
    return process.env.IIIF_SERVER_SECRET;
  })(),

  accessToken: (() => {
    if (
      !process.env.IIIF_SERVER_ACCESS_TOKEN ||
      process.env.IIIF_SERVER_ACCESS_TOKEN === "null"
    )
      throw new Error("The access token is not defined");
    return process.env.IIIF_SERVER_ACCESS_TOKEN;
  })(),

  port: (() => {
    const port = process.env.IIIF_SERVER_PORT
      ? parseInt(process.env.IIIF_SERVER_PORT)
      : 0;
    return port >= 0 ? port : 3333;
  })(),

  logLevel: (() => {
    return process.env.IIIF_SERVER_LOG_LEVEL &&
      process.env.IIIF_SERVER_LOG_LEVEL !== "null"
      ? process.env.IIIF_SERVER_LOG_LEVEL
      : "debug";
  })(),

  baseUrl: (() => {
    if (
      !process.env.IIIF_SERVER_BASE_URL ||
      process.env.IIIF_SERVER_BASE_URL === "null"
    )
      throw new Error("The base url is not defined");
    return process.env.IIIF_SERVER_BASE_URL;
  })(),

  loginDisabled: (() => {
    const loginDisabled = process.env.IIIF_SERVER_LOGIN_DISABLED;
    return (
      loginDisabled !== undefined &&
      (loginDisabled.toLowerCase() === "true" || loginDisabled === "1")
    );
  })(),

  solr: (() => {
    const host =
      process.env.IIIF_SERVER_SOLR_HOST &&
      process.env.IIIF_SERVER_SOLR_HOST !== "null"
        ? process.env.IIIF_SERVER_SOLR_HOST
        : "localhost";
    const port =
      process.env.IIIF_SERVER_SOLR_PORT &&
      parseInt(process.env.IIIF_SERVER_SOLR_PORT) > 0
        ? parseInt(process.env.IIIF_SERVER_SOLR_PORT)
        : 8983;
    const delay =
      process.env.IIIF_SERVER_SOLR_DELAY &&
      parseInt(process.env.IIIF_SERVER_SOLR_DELAY) > 0
        ? parseInt(process.env.IIIF_SERVER_SOLR_DELAY)
        : 100;
    const core =
      process.env.IIIF_SERVER_SOLR_CORE &&
      process.env.IIIF_SERVER_SOLR_CORE !== "null"
        ? process.env.IIIF_SERVER_SOLR_CORE
        : "iiif";
    const maxRows =
      process.env.IIIF_SERVER_SOLR_MAX_ROWS &&
      parseInt(process.env.IIIF_SERVER_SOLR_MAX_ROWS) > 0
        ? parseInt(process.env.IIIF_SERVER_SOLR_MAX_ROWS)
        : 100;

    return { host, port, delay, core, maxRows };
  })(),
};

// For test purposes
export function setConfig<P extends keyof Config, V extends Config[P]>(
  property: P,
  value: V
): void {
  if (config.env === "test") config[property] = value;
}

export default config;
