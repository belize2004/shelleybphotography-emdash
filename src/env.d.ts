/// <reference path="../worker-configuration.d.ts" />
/// <reference path="../emdash-env.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    runtime: {
      env: Cloudflare.Env & Record<string, any>;
    };
  }
}
