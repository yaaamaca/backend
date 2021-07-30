# yaaamaca

yet another attempt at making a chat app 

## api

### POST `/create_node`
create a new node.
#### Request
- parent
- refs_to (optional)
- content (optional)

### GET `/node/<id>[?content=1]`
gets infomation about the channel
#### Response
- author
- parent
- type
- content (optional)

### GET `/node/<id>/content`
gets content of a node
##### Response
- content

### GET `/node/<id>/members`
gets members of a node
#### Request
- index_from `int`
- index_to `int`
#### Response
- list of user

### GET `/node/<id>/children`
gets nodes referencing this one
#### Request
- index_from `int` (optional)
- index_to `int` (optional)
- time_from `int` (optional)
- time_to `int` (optional)
#### Response
- list of node id

#### POST `/node/<id>/members/<id>`
add a member to a node

#### DELETE `/node/<id>/members/<id>`
remove a member from a node

### PATCH `/node/<id>/content`
update a nodes content
#### Request
- new content

### PATCH `/node/<id>/parent`
reparent a node
#### Request
- new parent

### WEBSOCKET `/node/<id>/events`
connect to a websocket that sends all events the happen to the node
#### Packets
- action `"change" | "add" | "remove"`
- type `"ref_to" | "ref_by" | "content" | "parent" | "type" | "members"`
- content `string`

## data models

### client
- name `string`
- token `string`

### node
- author `-> client`
- type `string`
- content `string`
- children `zset -> node (score: timestamp)`
- members `set -> client`
- parent `-> node`

## Licence

See `LICENCE` file.

