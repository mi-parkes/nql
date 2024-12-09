const peg = require("pegjs");

module.exports = { 
    startTimer,
    stopTimer,
    prepareParser,
    parse_input,
    custom_filter,
    processJSON,
    prettyJ
};

let verbose=false;

function startTimer() {
    startTime = performance.now();
}

function stopTimer(msg) {
    const endTime = performance.now();
    console.log(`Execution time of ${msg}`,endTime - startTime);
}

function getType(att) {
    var type = typeof att;
    if (type === 'object')
        type = Array.isArray(att) ? 'array' : 'object';
    return type;
}

function arraysEqual(a, b) {
    return a.length === b.length &&
        a.sort().every((value, index) => value === b.sort()[index]);
}

function isArrayInArray(subArray, mainArray) {
    return subArray.every(item => mainArray.includes(item));
}

function mergeUniqueLists(lists, node) {
    // Create a Set to store unique values
    const uniqueSet = new Set();

    // Iterate through each list and add its elements to the Set
    lists.forEach(list => {
        if (list.operation === '+')
            node[list.value].forEach(item => uniqueSet.add(item));
    });

    lists.forEach(list => {
        if (list.operation === '-')
            node[list.value].forEach(item => uniqueSet.delete(item));
    });

    // Convert the Set back to an array
    return [...uniqueSet];
}

function filterOutKeys(obj, keysToRemove) {
    return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keysToRemove.includes(key))
    );
}

class Node {
  constructor(left, right, operator) {
      this.left = left;
      this.right = right;
      this.operator = operator
  };
  static class(obj) {
      return new Node(obj.left, obj.right, obj.operator);
  }
  get(node) {
      return Node.create(node).expand();
  }
  getValue(node) {
      if (verbose)
          console.log('expand():', this);
      if ('type' in node) {
          if (node['type'] == 'array')
              return node.value;
          else
              return node.value;
      } else
          return this.get(node)
  }
  expand() {
      let lhs = 'type' in this.left ?
          this.getValue(this.left) : this.get(this.left);
      let rhs = 'type' in this.right ?
          this.getValue(this.right) : this.get(this.right);
      return `${lhs} ${this.operator} ${rhs} `
  }
  print() {
      console.log(this.expand());
  }
  cast(node) {
      return Node.create(node);
  }
  isObject(node) { return !('type' in node); }
  evaluate(currentNode) {
      var ret = false;
      switch (this.operator) {
          case "!": {
              ret = !this.cast(this.left).evaluate(currentNode);
              break;
          }
          case "||": {
              ret = (
                  (this.isObject(this.left) ? this.cast(this.left).evaluate(currentNode) : this.left['value']) ||
                  (this.isObject(this.right) ? this.cast(this.right).evaluate(currentNode) : this.right['value'])
              )
              break;
          }
          case "&&": {
              ret = (
                  (this.isObject(this.left) ? this.cast(this.left).evaluate(currentNode) : this.left['value']) &&
                  (this.isObject(this.right) ? this.cast(this.right).evaluate(currentNode) : this.right['value'])
              )
              break;
          }
          case "!=": {
              const lhs = (this.left.source === 'attr') ? currentNode['data'][this.left.value] : this.left.value;
              const rhs = (this.right.source === 'attr') ? currentNode['data'][this.right.value] : this.right.value;
              const lhs_type = typeof this.left.value;
              if (this.left.type === 'array' && lhs_type !== 'string') {
                  if (verbose)
                      for (const elm of this.left.value) {
                          console.log(read_needs.prettyJ(filterOutKeys(elm, ['description']), null, 2));
                      };
                  const newList = mergeUniqueLists(this.left.value, currentNode['data']);
                  ret = !arraysEqual(newList, rhs);
                  break
              }
              if (this.left.type === 'array')
                  ret = !arraysEqual(lhs, rhs);
              else
                  ret = lhs !== rhs;
              break;
          }
          case "==": {
              const lhs = (this.left.source === 'attr') ? currentNode['data'][this.left.value] : this.left.value;
              const rhs = (this.right.source === 'attr') ? currentNode['data'][this.right.value] : this.right.value;
              const lhs_type = typeof this.left.value;
              if (this.left.type === 'array' && lhs_type !== 'string') {
                  if (verbose)
                      for (const elm of this.left.value) {
                          console.log(read_needs.prettyJ(filterOutKeys(elm, ['description']), null, 2));
                      };
                  const newList = mergeUniqueLists(this.left.value, currentNode['data']);
                  ret = arraysEqual(newList, rhs);
                  break
              }
              if (this.left.type === 'array')
                  ret = arraysEqual(lhs, rhs);
              else
                  ret = lhs === rhs;
              break;
          }
          case "in": {
              const lhs = (this.left.source === 'attr') ? currentNode['data'][this.left.value] : this.left.value;
              const rhs = (this.right.source === 'attr') ? currentNode['data'][this.right.value] : this.right.value;
              if (this.left.type === 'string')
                  ret = rhs.includes(lhs);
              else
                  ret = isArrayInArray(lhs, rhs);
              break;
          }
          case "~":
          case "~i":
              {
                  const lhs = (this.left.source === 'attr') ? currentNode['data'][this.left.value] : this.left.value;
                  const rhs = (this.right.source === 'attr') ? currentNode['data'][this.right.value] : this.right.value;
                  let re = new RegExp(rhs, this.operator == "~i" ? "i" : "");
                  if(this.left.type==='string')
                      ret = lhs.match(re);
                  else {
                      const lhs_type = typeof this.left.value;
                      if (this.left.type === 'array' && lhs_type !== 'string') {
                          if (verbose)
                              for (const elm of this.left.value) {
                                  console.log(read_needs.prettyJ(filterOutKeys(elm, ['description']), null, 2));
                              };
                              const newList = mergeUniqueLists(this.left.value, currentNode['data']);
                              for(const e of newList) {
                                  ret = e.match(re);
                                  if(ret)
                                      break;
                              }
                          }
                      else
                      for(const e of lhs) {
                          ret = e.match(re);
                          if(ret)
                              break;
                      }
                  }
                  break;
              }
      }
      return ret;
  }
}

Node.create = function (obj) {
  var field = new Node();
  for (var prop in obj) {
      if (field.hasOwnProperty(prop)) {
          field[prop] = obj[prop];
      }
  }
  return field;
}

function filterOutKeys(obj, keysToRemove) {
  return Object.fromEntries(
      Object.entries(obj).filter(([key]) => !keysToRemove.includes(key))
  );
}

function convert_text_to_html(text) {
    //Escape special characters to prevent XSS attacks
    escaped_text = encodeURIComponent(text);
    html_text = escaped_text.replace('\n','<br>');
    return html_text;
}

function prepareParser(traceParser) {
  let grammar_code = `
  {
      const { config } = options;

      function getType(arg) {
          const type=typeof arg;
          if(type==='object')
              return Array.isArray(arg) ? 'array':'object';
          else
              return type;
      }

      function validate_types(left, right) {
          if (left.type !== right.type) {
              throw new TypeError("Type mismatch: " + left.type + " and " + right.type);
          }
          if (left.source === right.source) {
              throw new TypeError("Source match: " + left.source + " and " + right.source);
          }
      }
  }
  `;

  let grammar = `

  ${grammar_code}

  start
      = expression

  expression
      = or_expr

  OR
      = _ oper:("||") {
      return oper;
  }

  or_expr
      = lhs:and_expr oper:OR _ rhs:or_expr {
          return { left: lhs, right: rhs, operator: oper };
      } / lhs:and_expr {
          return lhs;
      }

  AND
      = _ oper:("&&") {
      return oper;
  }

  NOT
      = "!" _ {
      return "!";
  }

  // r1  = compare_expr / reg_exp_expr / inside_expr / grouped_expr

  r1 = neg_expr

  neg_expr
      = oper:NOT expr:primary_expr {
          return { left: expr, right:null, operator:oper };
      } / expr:primary_expr {
          return expr;
      }

  primary_expr
      = compare_expr / reg_exp_expr / inside_expr / grouped_expr

  grouped_expr
      = "(" _ expr:expression _ ")" {
          return expr;
      }

  and_expr
      = lhs:r1 oper:AND _ rhs:and_expr {
          return { left:lhs, right:rhs, operator:oper };
      } / lhs:r1 {
          return lhs;
      }

  compare_oper
      =  _ oper:( "==" / "!=" )  {
      return oper;
  }

  inside_oper
      =  __ oper:( "in" ) __  {
      return oper;
  }

  compare_expr
      = lhs:atom  oper:compare_oper rhs:atom  {
      //console.log("lsh="+lhs.source);
      //console.log(JSON.stringify(lhs,null,2));
      //console.log(JSON.stringify(rhs,null,2));
      //if(typeof oper !== 'undefined') {
          //console.log("OKOK");
      validate_types(lhs,rhs);
      return { left:lhs, right: rhs, operator: oper };
      // }
      // else
      //     return lhs;
  }

  inside_expr
      = lhs:atom oper:inside_oper rhs:atom {
      if(lhs.type==='array' && rhs.type==='string')
          throw new TypeError("Type mismatch: " + lhs.type + " and " + rhs.type);
      return { left:lhs, right: rhs, operator: oper };
  }

  reg_exp_oper
      =  _ oper:( "~" ) _  {
      return oper;
  }

  reg_exp_case 
      = c:("i"/"") {
      return c;
  }
  reg_exp_pattern = [^/]
  reg_exp_value=reg_exp_oper "/" r:$(reg_exp_pattern+) "/" c:reg_exp_case {
      return {
          value:r,
          ...(config.verbose ? { location: location() } : {}),
          operator:"~"+c,
          type:'RegEx'
      };
  }

  reg_exp_expr
      = lhs:(array_set / needs_attribute) rhs:reg_exp_value  {
      /*if(lhs.type==='array')
          throw new TypeError("Regular expression supported only with string argument");*/
      return { 
          left:lhs,
          right: rhs,
          operator: rhs.operator
      };
  }

  set_oper
      = _ r:("+" / "-") { return r; } / 
          "" { return '+' }

  array_set
      = "(" o:set_oper _ head:needs_attribute tail:(set_oper needs_attribute)* _ ")" {
      if(config.verbose)
          console.log("head="+head,"tail="+tail);
      //const union=[head, ...tail.map(([_, array]) => array)];
      const union=[({operation:o ,...head}), ...tail.map(([_, array]) => ({operation:_,...array}))];
      if(config.verbose)
          console.log("union="+union);
      for(const f of union) {
          if(f.type!=='array' && f.source!=='attr')
              throw new TypeError("Array union can be applied only on needs link attributes");
          if(config.verbose)
              console.log(JSON.stringify(f,null,2));
      }
      return { 
          value:union,
          type:'array'
      };
  }

  atom
      = string_literal
      / array_literal
      / array_set
      / needs_attribute
  
  // optional whitespace
  _  = [ \\t\\r\\n]*

  // mandatory whitespace
  __ = [ \\t\\r\\n]+

  array_literal 
       = _ "[" e:elements  "]" {
          if(config.verbose)
              console.log(typeof(elements));
          return { 
              source: "literal",
              type: "array", 
              value: e
          };
    }

  needs_attribute
    = attr:$(char+) { 
      if(config.sphinx_needs==null)
          error("No needs data available");
      var keys=Object.keys(config.sphinx_needs);
      if(attr.length<=20) {
          if(keys.length==0)
              error("No needs data available");
          if(attr in config.sphinx_needs['data']) {
              return {   
                  value:attr,
                  ...(config.verbose ? { location: location() } : {}),
                  type:getType(config.sphinx_needs['data'][attr]),
                  source:'attr'};
          }
          else
              error("Attribute not found in needs:"+attr);
      } else
          error("Word does have more than 20 letters");
  }

  comma= _ "," {return "" }
  elements
    = head:string _ tail:(comma string)* _ {
        return [head, ...tail.map(e => e[1])];
    } / "" { return []; }
  
  string
    = _ "'" s:$(char+) "'" { return s }

  string_literal = s:string {
      //console.log('string_literal='+s)
      return {
          value:s,
          ...(config.verbose ? { location: location() } : {}),
          type:'string',
          source:'literal'};
  }

  char
    = [A-Za-z0-9_]
  `;
  parser=peg.generate(grammar,traceParser?{trace:true}:{});
  return parser;
}

function parse_input(parser,config,input) {
    let AST;
    try {
        AST = parser.parse(input,{config});
    } catch (error) {
        console.error(`Failure parsing input: ${input} -> ${error}`);
        throw error;
    }
    return AST;
}

function custom_filter(currentNode,expr) {
    return Node.create(expr).evaluate(currentNode);
}

///////

type2color = {
    'func': '#D4E6F1',
    'uc':   '#D4E6F1',
    'req':  '#DEFFDC',
    'dia':  '#D4E6F1',
    'spec': '#FFFF99',
    'need': '#9856a5',
    'test': '#87CEFA',
    'impl': '#ffcccc',
};

const link_types = ['links', 'refines', 'triggers', 'associated', 'composed', 'implements', 'specifies', 'satisfies', 'validation', 'verifies', 'motivation', 'requires'];

function parse_links(need) {
    links = [];
    for (const link_type of link_types) {
        if (link_type in need) {
            links = links.concat(need[link_type]);
        }
    }
    if (verbose)
        console.log(links);
    return links;
}

function convert_text_to_html(text) {
    //Escape special characters to prevent XSS attacks
    escaped_text = encodeURIComponent(text);
    html_text = escaped_text.replace('\n', '<br>');
    return html_text;
}

function processJSON(data,_verbose=false) {
    verbose=_verbose;
    const needs = data['versions']['1.0']['needs']
    let nodes = [];
    let edges = [];
    let children={};
    let parents={};
    let gnodes = {};
    for (const key in needs) {
        children[key]=[];
        parents[key]=[];
        if (verbose)
            console.log(key, needs[key].docname);
        var jsonData = {
            'data': {
                'docname': needs[key]['docname'],
                'type': needs[key]['type'],
                'title': needs[key]['title'],
                'status': needs[key]['status'],
                'id': needs[key]['id'],
                'links': needs[key]['links'],
                'description':needs[key]['description']
            }
        };
        jsonData['shape'] = 'box'
        jsonData['id'] = needs[key].id
        if (needs[key].type in type2color) {
            jsonData['color'] = type2color[needs[key].type];
        } else {
            jsonData['color'] = 'white'
        }
        needs[key]['index']=nodes.length;
        nodes.push(jsonData);
    }
    for (const key in needs) {
        if (verbose)
            console.log(`id=${needs[key].id}`);
        for (edge of parse_links(needs[key])) {
            var jsonData = {};
            edges.push({ 'from': needs[key].id, 'to': edge });
        }
    }

    // add children and parents
    for(const key in needs) {
        const index=needs[key]['index'];
        for(const link_type of link_types) {
            const linktype_back=`${link_type}_back`
            if(link_type in needs[key]) {
                for(to of needs[key][link_type]) {
                    if(to in needs) {
                        children[to].push(key);
                        parents[key].push(to);
                    }
                }
            }
            if(linktype_back in needs[key])
                nodes[index]['data'][linktype_back]=needs[key][linktype_back];
        }
        nodes[index]['data']['incoming']=children[key];
        nodes[index]['data']['outgoing']=parents[key];
        gnodes[key]=nodes[index];
    }

    return { 
        'gnodes': gnodes,
        'nodes': nodes,
        'edges': edges,
        children:children,
        parents:parents }
    ;
}

function prettyJ(unordered) {
    let json = Object.keys(unordered).sort().reduce(
        (obj, key) => { 
          obj[key] = unordered[key]; 
          return obj;
        }, 
        {}
      );
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
      function (match) {
        let cls = "\x1b[36m";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "\x1b[34m";
          } else {
            cls = "\x1b[32m";
          }
        } else if (/true|false/.test(match)) {
          cls = "\x1b[35m"; 
        } else if (/null/.test(match)) {
          cls = "\x1b[31m";
        }
        return cls + match + "\x1b[0m";
      }
    );
  }

// https://stackoverflow.com/questions/4810841/pretty-print-json-using-javascript
class Nodex {
    constructor(node) {
        this.node=node;
    }
    print() {
        console.log(prettyJ(this.node,null,2));
    }
    static create(obj) {
        return new Nodex(obj);
    }
};