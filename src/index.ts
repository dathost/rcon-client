/*
author: majorek31
credits: https://wiki.vg/RCON
*/
import { createConnection, Socket } from "node:net";
import { Buffer } from "node:buffer";
import { randomInt } from "node:crypto";
import { setTimeout, clearTimeout } from "node:timers";
type Options = {
  host: string;
  port: number;
  password: string;
  timeout?: number;
};
enum RequestId {
  CMD_RESPONSE = 0,
  CMD_REQUEST = 2,
  LOGIN = 3,
}
export class Rcon {
  options: Options;
  socket?: Socket;
  connected: boolean;
  authed: boolean;
  id: number;
  constructor(options: Options) {
    this.options = options;
    this.connected = false;
    this.authed = false;
    this.id = 0;
  }
  connect() {
    return new Promise<null | Error>((resolve, reject) => {
      this.socket = createConnection({
        host: this.options.host,
        port: this.options.port,
      });

      let timeoutHandle: NodeJS.Timeout;
      if (this.options.timeout) {
        timeoutHandle = setTimeout(() => {
          this.socket?.destroy();
          reject(new Error("Socket timeout"));
        }, this.options.timeout);
      }

      this.socket.once("error", (e) => reject(e));
      this.socket.once("connect", () => {
        clearTimeout(timeoutHandle);
        this.connected = true;
        this.id = randomInt(2147483647);
        this.sendRaw(this.options.password, RequestId.LOGIN);
        this.socket?.once("data", (data) => {
          let response: number = data.readInt32LE(4);
          if (response == this.id) {
            this.authed = true;
            resolve(null);
          } else {
            this.disconnect();
            reject(new Error("Authentication error"));
          }
        });
      });
    });
  }
  sendRaw(data: string, requestId: RequestId) {
    return new Promise<string>((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error("Authentication error"));
        return;
      }

      let timeoutHandle: NodeJS.Timeout;
      if (this.options.timeout) {
        timeoutHandle = setTimeout(() => {
          this.socket?.destroy();
          reject(new Error("Socket timeout"));
        }, this.options.timeout);
      }

      let len = Buffer.byteLength(data);
      let buffer = Buffer.alloc(len + 14);
      buffer.writeInt32LE(len + 10, 0);
      buffer.writeInt32LE(this.id, 4);
      buffer.writeInt32LE(requestId, 8);
      buffer.write(data, 12, "utf8");
      buffer.writeInt16LE(0, 12 + len);
      this.socket.write(buffer);
      this.socket.once("data", (data: Buffer) => {
        clearTimeout(timeoutHandle);
        resolve(data.toString("utf8", 12));
      });
    });
  }
  send(cmd: string) {
    return this.sendRaw(cmd, 2);
  }
  disconnect() {
    this.connected = false;
    this.authed = false;
    this.socket?.end();
  }
}
