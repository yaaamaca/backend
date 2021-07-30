import { NextFunction, Request, Response } from "express"
import { async_redis, redis } from "./database"

export function id_counter(): Promise<number> {
    return new Promise((res, rej) => {
        redis.incr("id_counter", (err, reply) => {
            if (err) rej(err)
            res(reply)
        })
    })
}

export function timestamp(): number {
    return Date.now()
}

export function id_is_valid(id: string): boolean {
    return !Number.isNaN(parseInt(id))
}

export function check_id(req: Request, res: Response, next: NextFunction) {
    if (id_is_valid(req.params.id)) return next()
    res.status(400).send("malformed id")
}

export async function check_node_exists(req: Request, res: Response, next: NextFunction) {
    if (await async_redis.get(`node:${req.params.id}:parent`)) return next()
    return res.status(400).send("node does not exist")

}

export async function get_client_id(req: Request, res: Response): Promise<string | undefined> {
    if (!req.headers.authorization) {
        res.status(403).send("authorization header missing")
        return
    }
    const uid = await async_redis.hget(`tokens`, req.headers.authorization)
    if (!uid) {
        res.status(403).send("token invalid")
        return
    }
    return uid
}

export async function assert_member(req: Request, res: Response, next: NextFunction) {
    const uid = await get_client_id(req, res)
    if (!uid) return
    let nid: string | null = req.params.id
    while (nid && nid != "0") {
        const is_member = await async_redis.sismember(`node:${nid}:members`, uid)
        if (is_member) return next()
        nid = await async_redis.get(`node:${nid}:parent`)
    }
    res.status(403).send("not a member of this node")
}

export async function assert_author(req: Request, res: Response, next: NextFunction) {
    const uid = await get_client_id(req, res)
    if (!uid) return
    const node_author = await async_redis.get(`node:${req.params.id}:author`)
    if (node_author == uid) next()
    res.status(403).send("not the author of this node")
}

