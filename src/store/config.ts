import defaultConfig from "./config.default";
import { configPath } from "../lib/constants";
import { Config } from "../types";

const loadConfig = async () => {
  const { Low } = await import("lowdb");
  const { JSONFile } = await import("lowdb/node");
  const { merge } = await import("lodash-es");
  const config = new Low<Config>(new JSONFile(configPath), defaultConfig);

  await config.read();

  config.data = merge({}, defaultConfig, config.data);

  await config.write();

  return config;
}

export default loadConfig;
