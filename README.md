# nql
sphinx-Needs Query Language

## Installation

```
npm install
```

## Usage
List available attributes:

```
node src/nql.js -a "" needs-13112024.json
```

Using dynamic attribute 'incoming':
```
node src/nql.js "incoming ~ /^req.*00048/" needs-13112024.json | jq .
```

Basic filtering:
```
node src/nql.js  "type=='req'" needs-13112024.json | jq .
```
