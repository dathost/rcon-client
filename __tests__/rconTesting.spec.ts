import { Rcon, RconOptions } from "../lib";

const getRconClient = (options?: Partial<RconOptions>) => {
  return new Rcon({
    host: process.env.RCON_HOST || "localhost",
    port: process.env.RCON_PORT ? parseInt(process.env.RCON_PORT) : 25575,
    password: process.env.RCON_PASSWORD || "testing",
    ...options,
  });
};

test("Test connection", async () => {
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

test("Test data fetching", async () => {
  const client = getRconClient();
  await client.connect();
  const res = await client.send("this command doesn t exist");
  expect(res.startsWith("Unknown command")).toBeTruthy();
  client.disconnect();
});

test("Test big response", async () => {
  const client = getRconClient();
  await client.connect();
  const res = await client.send("cvarlist");
  expect(res.endsWith("total convars/concommands\n")).toBeTruthy();
  client.disconnect();
});

test("Test auth fail", async () => {
  const client = getRconClient({ password: "benan" });
  expect(client.connect()).rejects.toThrow("Authentication error");
});

test("Test connect timeout", async () => {
  const client = getRconClient({ timeout: 1 });
  await expect(client.connect()).rejects.toThrow(
    /Rcon connect to .+:\d+ timed out after 1ms/,
  );
  client.disconnect();
});

test("Test auth timeout", async () => {
  const client = getRconClient({ connectTimeout: 5000, timeout: 1 });
  await expect(client.connect()).rejects.toThrow(
    /Rcon command ".+" to .+:\d+ timed out after 1ms/,
  );
  client.disconnect();
});
