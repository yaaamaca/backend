import { Application } from "express-ws"
import { createClient } from "redis"
import { assert_author, assert_member, check_id, check_node_exists, get_client_id, id_counter, id_is_valid, timestamp } from "./api_helper"
import { async_redis, redis } from "./database"

export function bind_api(app: Application) {
    // TODO make the api only finish the request once database actions are done
    app.post("/create_node", async (req, res) => {
        if (!id_is_valid(req.body.parent)) return res.status(400).send("parent id invalid")
        const id = (await id_counter()).toString()
        const client = await get_client_id(req,res)
        if (!client) return
        const parent = req.body.parent

        redis.set(`node:${id}:parent`, req.body.parent)

        redis.zadd(`node:${parent}:children`, timestamp(), id)
        redis.publish(`node:${id}:events`, `add child ${parent}`)
        
        redis.set(`node:${id}:author`, client)
        
        redis.sadd(`node:${id}:members`, client)

        if (req.body.content) async_redis.set(`node:${id}:content`, req.body.content)
        if (req.body.type) async_redis.set(`node:${id}:type`, req.body.type)
        res.send("ok")
    })

    app.get("/node/:id", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
        res.send(JSON.stringify({
            parent: await async_redis.get(`node:${id}:parent`),
            author: await async_redis.get(`node:${id}:author`),
            type: await async_redis.get(`node:${id}:type`),
            content: req.query.content ? await async_redis.get(`node:${id}:content`) : undefined,
            child_count: await async_redis.zcount(`node:${id}:children`, -Infinity, +Infinity),
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

    app.get("/node/:id/children", check_id, check_node_exists, assert_member, async (req, res) => {
        const id = req.params.id
        if (req.query.index_from && req.query.index_to) {
            if (typeof req.query.index_from != "string") return res.status(400).send("'index_from' must be a single string")
            if (typeof req.query.index_to != "string") return res.status(400).send("'index_to' must be a single string")
            const index_from = parseInt(req.query.index_from ?? "asd") || 0
            const index_to = parseInt(req.query.index_to ?? "asd") || 0
            // TODO prevent query of too many children at once
            res.send(JSON.stringify(await async_redis.zrange(`node:${id}:children`, index_from, index_to)))
        } else {
            res.send(JSON.stringify(await async_redis.zrange(`node:${id}:children`, 0, 1000)))
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


