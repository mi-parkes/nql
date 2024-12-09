# nql
sphinx-Needs Query Language

## Installation

```
npm install
```

## Usage

```
node src/nql.js "incoming ~ /^req.*00048/" needs-13112024.json | jq .
```

```
node src/nql.js  "type=='req'" needs-13112024.json | jq .
```
