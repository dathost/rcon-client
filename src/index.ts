/*
author: majorek31
credits: https://wiki.vg/RCON
*/
import { createConnection, Socket } from "node:net";
import { Buffer } from "node:buffer";
import { randomInt } from "node:crypto";
import { setTimeout, clearTimeout } from "node:timers";

export type RconOptions = {
  connectTimeout?: number;
  host: string;
  port: number;
  password: string;
  timeout?: number;
};

enum PacketType {
  SERVERDATA_RESPONSE_VALUE = 0,
  SERVERDATA_EXECCOMMAND = 2,
  SERVERDATA_AUTH = 3,
}

export class Rcon {
  options: RconOptions;
  socket?: Socket;
  connected: boolean;
  authed: boolean;
  constructor(options: RconOptions) {
    this.options = options;
    this.connected = false;
    this.authed = false;
  }
  connect() {
    return new Promise<null | Error>((resolve, reject) => {
      this.socket = createConnection({
        host: this.options.host,
        port: this.options.port,
      });

      let timeoutHandle: NodeJS.Timeout;
      const connectTimeout =
        this.options.connectTimeout ?? this.options.timeout;
      if (connectTimeout) {
        timeoutHandle = setTimeout(() => {
          this.socket?.destroy();
          reject(
            new Error(
              `Rcon connect to ${this.options.host}:${this.options.port} timed out after ${connectTimeout}ms`,
            ),
          );
        }, connectTimeout);
      }

      this.socket.once("error", (e) => reject(e));
      this.socket.once("connect", () => {
        clearTimeout(timeoutHandle);
        this.connected = true;
        this.sendRaw(this.options.password, PacketType.SERVERDATA_AUTH).catch(
          (e) => reject(e),
        );
        this.socket?.once("data", (data) => {
          const responseId = data.readInt32LE(4);
          if (responseId === -1) {
            this.disconnect();
            reject(new Error("Authentication error"));
          } else {
            this.authed = true;
            resolve(null);
          }
        });
      });
    });
  }
  sendRaw(data: string, packetType: PacketType) {
    return new Promise<string>((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error("Authentication error"));
        return;
      }

      let timeoutHandle: NodeJS.Timeout;
      if (this.options.timeout) {
        timeoutHandle = setTimeout(() => {
          this.socket?.destroy();
          reject(
            new Error(
              `Rcon command "${data}" to ${this.options.host}:${this.options.port} timed out after ${this.options.timeout}ms`,
            ),
          );
        }, this.options.timeout);
      }

      const requestId = randomInt(2147483647);
      const len = Buffer.byteLength(data);
      const buffer = Buffer.alloc(len + 14);
      buffer.writeInt32LE(len + 10, 0);
      buffer.writeInt32LE(requestId, 4);
      buffer.writeInt32LE(packetType, 8);
      buffer.write(data, 12, "utf8");
      buffer.writeInt16LE(0, 12 + len);
      this.socket.write(buffer);

      const chunks: string[] = [];
      const handleData = (data: Buffer) => {
        const body = data.toString("utf8", 12);
        chunks.push(body);
        if (body.endsWith("\u0000\u0000")) {
          this.socket?.off("data", handleData);
          clearTimeout(timeoutHandle);
          resolve(chunks.join("").slice(0, -2));
        }
      };
      this.socket.on("data", handleData);
    });
  }
  send(cmd: string) {
    return this.sendRaw(cmd, PacketType.SERVERDATA_EXECCOMMAND);
  }
  disconnect() {
    this.connected = false;
    this.authed = false;
    this.socket?.end();
  }
}
