import * as assert from "node:assert";
import { it } from "node:test";
import { Rcon, RconOptions } from "../lib";

const getRconClient = (options?: Partial<RconOptions>) => {
  return new Rcon({
    host: process.env.RCON_HOST || "localhost",
    port: process.env.RCON_PORT ? parseInt(process.env.RCON_PORT) : 25575,
    password: process.env.RCON_PASSWORD || "testing",
    ...options,
  });
};

it("Test connection", async () => {
  const client = getRconClient();
  try {
    await client.connect();
    client.disconnect();
  } catch (err) {
    console.error(
      'In order to test this you have to run a Rcon server on your local machine on port 25575 with password "testing"!',
    );
    throw err;
  }
  client.disconnect();
});

it("Test data fetching", async () => {
  const client = getRconClient();
  await client.connect();
  const res = await client.send("this command doesn t exist");
  assert(res.startsWith("Unknown command"));
  client.disconnect();
});

it("Test big response", async () => {
  const client = getRconClient();
  await client.connect();
  const res = await client.send("cvarlist");
  assert(res.endsWith("total convars/concommands\n"));
  client.disconnect();
});

it("Test auth fail", async () => {
  const client = getRconClient({ password: "benan" });
  await assert.rejects(client.connect(), "Authentication error");
  client.disconnect();
});

it("Test connect timeout", async () => {
  const client = getRconClient({ timeout: 1 });
  await assert.rejects(
    client.connect(),
    /Rcon connect to .+:\d+ timed out after 1ms/,
  );
  client.disconnect();
});

it("Test auth timeout", async () => {
  const client = getRconClient({ connectTimeout: 5000, timeout: 1 });
  await assert.rejects(
    client.connect(),
    /Rcon command ".+" to .+:\d+ timed out after 1ms/,
  );
  client.disconnect();
});
