#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { requestMFA } from "./lib/mfa.js";

yargs(hideBin(process.argv))
  .command("$0 <user> [profile]", "request MFA for user", () => {}, requestMFA)
  .help()
  .parse();
