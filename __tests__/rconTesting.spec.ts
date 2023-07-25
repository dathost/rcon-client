import { Rcon } from "../lib";

const getRconClient = () => {
  return new Rcon({
    host: process.env.RCON_HOST || "localhost",
    port: process.env.RCON_PORT ? parseInt(process.env.RCON_PORT) : 25575,
    password: process.env.RCON_PASSWORD || "testing",
  });
};

test("Test connection", async () => {
  const client = getRconClient();
  try {
    await client.connect();
    client.disconnect();
  } catch (err) {
    expect(err).toBe(null);
    console.error(
      'In order to test this you have to run a Rcon server on your local machine on port 25575 with password "testing"!',
    );
  }
  client.disconnect();
});

test("Test data fetching", async () => {
  const client = getRconClient();
  try {
    await client.connect();
    const res = await client.send("this command doesn t exist");
    expect(res).toBe('Unknown command. Type "/help" for help.');
    client.disconnect();
  } catch (err) {
    client.disconnect();
  }
  client.disconnect();
});
