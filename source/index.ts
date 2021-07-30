
import express from "express"
import expressWs from "express-ws"
import { bind_api } from "./api"
import { redis } from "./database"

const app_e = express()
const app = expressWs(app_e).app
app_e.use(express.json())


redis.setnx("node:0:parent", "0")
redis.setnx("node:0:type", "channel_group")
redis.setnx("node:0:author", "0")
redis.sadd("node:0:members", "0")
redis.setnx("node:0:content", "this is the root node")

redis.setnx("id_counter", "1")

redis.setnx("user:0:name", "root user")
redis.set("user:0:token", "this-is-very-secure-indeed")
redis.hsetnx("tokens", "this-is-very-secure-indeed", "0")

bind_api(app)

const port = parseInt(process.env.PORT || "asd") || 1269
const host = process.env.HOST ?? "127.0.0.1"
app.listen(port, host, () => console.log(`service bound to ${host}:${port}`))
