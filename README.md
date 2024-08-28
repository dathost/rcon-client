# dathost-rcon-client

## Promise based rcon client, with support of types

## Installation
```
npm i dathost-rcon-client
```
## Usage
```
import { Rcon } from "dathost-rcon-client";
const client = new Rcon({
  // all of those are required!
  port: 25575,
  host: "localhost",
  password: "test",
});
try {
  await client.connect();
  const response = await client.send("status");
  console.log(response);
} catch (e) {
  console.log(`Got error ${e}`);
} finally {
  client.disconnect();
}
```
