import { createClient } from "redis"
import { promisify } from "util"

export const redis = createClient()
export const async_redis = {
    get: promisify(redis.get).bind(redis),
    set: promisify(redis.set).bind(redis),
    hget: promisify(redis.hget).bind(redis),
    hset: promisify(redis.hset).bind(redis),
    zrange: promisify(redis.zrange).bind(redis),
    zrangebyscore: promisify(redis.zrangebyscore).bind(redis),
    smembers: promisify(redis.smembers).bind(redis),
    sismember: promisify(redis.sismember).bind(redis),
    sadd: promisify(redis.sadd).bind(redis),
    spop: promisify(redis.spop).bind(redis),
    zcount: promisify(redis.zcount).bind(redis),
}
