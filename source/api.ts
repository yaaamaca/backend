import { Application } from "express-ws"
import { createClient } from "redis"
import { assert_author, assert_member, check_id, check_node_exists, id_counter, id_is_valid, timestamp } from "./api_helper"
import { async_redis, redis } from "./database"

export function bind_api(app: Application) {

    // TODO make the api only finish the request once database actions are done
    app.post("/create_node", async (req, res) => {
        const id = (await id_counter()).toString()
        // TODO implement validity checks
        redis.set(`node:${id}:parent`, req.body.parent)
        if (req.body.content) redis.set(`node:${id}:content`, req.body.content)
        if (req.body.refs_to) {
            for (const r of req.body.refs_to) {
                redis.zadd(`node:${id}:refs_to`, timestamp(), r)
                redis.publish(`node:${id}:events`, `add ref_to ${r}`)
                redis.zadd(`node:${r}:refs_by`, timestamp(), id)
                redis.publish(`node:${r}:events`, `add ref_by ${id}`)
            }
        }
        if (req.body.type) redis.set(`node:${id}:type`, req.body.type)
    })

    app.get("/node/:id", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
        res.send(JSON.stringify({
            parent: await async_redis.get(`node:${id}:parent`),
            author: await async_redis.get(`node:${id}:author`),
            type: await async_redis.get(`node:${id}:type`),
            content: req.query.content ? await async_redis.get(`node:${id}:content`) : undefined,
            ref_by_count: await async_redis.zcount(`node:${id}:refs_by`, -Infinity, +Infinity),
            ref_to_count: await async_redis.zcount(`node:${id}:refs_to`, -Infinity, +Infinity),
        }))
    })

    app.get("/node/:id/content", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
        res.send(await async_redis.get(`node:${id}:content`))
    })

    app.get("/node/:id/members", check_id, assert_member, async (req, res) => {
        const id = req.params.id
        // TODO query parameters
        res.send(JSON.stringify(await async_redis.smembers(`node:${id}:members`)))
    })

    app.patch("/node/:id", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
    })

    app.patch("/node/:id/content", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
    })

    app.get("/node/:id/refs_by", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
        if (req.query.index_from && req.query.index_to) {
            if (typeof req.query.index_from != "string") return res.status(400).send("'index_from' must be a single string")
            if (typeof req.query.index_to != "string") return res.status(400).send("'index_to' must be a single string")
            const index_from = parseInt(req.query.index_from ?? "asd") || 0
            const index_to = parseInt(req.query.index_to ?? "asd") || 0
            // TODO prevent query of too many refs at once
            res.send(JSON.stringify(await async_redis.zrange(`node:${id}:refs_by`, index_from, index_to)))
        } else {
            res.send(JSON.stringify(await async_redis.zrange(`node:${id}:refs_by`, 0, 1000)))
        }
    })

    app.get("/node/:id/refs_to", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
        if (req.query.index_from && req.query.index_to) {
            if (typeof req.query.index_from != "string") return res.status(400).send("'index_from' must be a single string")
            if (typeof req.query.index_to != "string") return res.status(400).send("'index_to' must be a single string")
            const index_from = parseInt(req.query.index_from ?? "asd") || 0
            const index_to = parseInt(req.query.index_to ?? "asd") || 0
            // TODO prevent query of too many refs at once
            res.send(JSON.stringify(await async_redis.zrange(`node:${id}:refs_to`, index_from, index_to)))
        } else {
            res.send(JSON.stringify(await async_redis.zrange(`node:${id}:refs_to`, 0, 1000)))
        }
    })

    app.delete("/node/:id", check_id, check_node_exists, assert_author, async (req, res) => {
        const id = req.params.id

    })

    app.get("/user/:id", check_id, async (req, res) => {
        const name = await async_redis.get(`user:${req.params.id}:name`)
        if (!name) res.status(404).send("user not found")
        res.send(JSON.stringify({ name }))
    })

    app.ws("/node/:id/subscribe", async (ws, req) => {
        const id = req.params.id
        if (!id_is_valid(id)) return ws.close(0, "id malformed")
        const lclient = createClient()
        lclient.subscribe(`node:${id}:events`)
        const listener = (channel: string, message: string) => {
            console.log(channel, message);
            ws.send(message)
        }
        lclient.on("message", listener)
        ws.onclose = () => {
            lclient.unsubscribe()
            lclient.off("message", listener)
        }
    })

}


