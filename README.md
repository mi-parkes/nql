# nql
sphinx-**N**eeds **Q**uery **L**anguage

## Installation

```
npm install
```

## Quick Start

* **Needs-extra configuration file example (needs_extras.json):**

  ```
  {
      "needs_extra_options": [
          "author",
          "date",
          "source",
          "supplier",
          "variant"
      ],
      "needs_extra_links": [
          {
              "option": "implements",
              "incoming": "implements",
              "outgoing": "implements"
          },
          {
              "option": "specifies",
              "incoming": "specifies",
              "outgoing": "specifies"
          },
          {
              "option": "satisfies",
              "incoming": "satisfies",
              "outgoing": "satisfies"
          }
      ]
  }
  ```

* **List available Sphinx-Needs attributes:**

  ```
  node src/nql.js -a --ne needs_extras.json "" needs-13112024.json
  ```

* **Filtering example 1:**

  ```
  node src/nql.js --ne needs_extras.json "specifies_back!=[]" needs-13112024.json
  ```

* **Filtering example 2:**

  ```
  node src/nql.js --ne needs_extras.json  "type=='req'" needs-13112024.json | jq .
  ```

## Query Language Syntax:

> **NOTE:** Parentheses should be used to group terms in filter expressions.

* **Operators:**
  * **Comparison Operators:**
    * `!=`: Not equal to
    * `==`: Equal to
  * **Logical Operators:**
    * `&&`: And
    * `||`: Or
    * `!`: Not
  * **Set Operators:**
    * `in`: Membership test
    * `~ /RegEx/`: Regular expression matching (case sensitive)
    * `~ /RegEx/i`: Regular expression matching (case insensitive)
    * **Array Operators:**
    * `+`: Union
    * `-`: Subtraction
  * **Parentheses:**
    * `()`: Used to group expressions and control operator precedence.
  * **Literals:**
    * **String Literals:**
      * Enclose strings in single quotes (`'`)
    * **Array Literals:**
      * `[]`: Empty array
      * `['req','impl']`: Array of strings
  * **Sphinx-Needs Attributes:**
       * `id`: Reference attributes directly using their names
       * `type`:
       * `...`
  * **Special (dynamic) attributes:**
    * `incoming`:  A dynamic attribute that lists all the needs that link to the current need.
    * `outgoing`: A dynamic attribute that lists all the needs that the current need links to.

## Advanced Query Examples:

   * **Filtering by Multiple Criteria:**
       ```
       status == "open" && type == 'req'
       ```
   * **Using Regular Expressions:**
     * **Filtering by String Attribute:**
       ```
       title ~ /urgent/
       ```
     *  **Filtering by Array or Dynamic Attributes:**
        ```
        type=='ftr' && (incoming ~ /^req/)
        ```

     *  **Filtering by Array or Dynamic Attributes with Union and Subtraction:**
        ```
        incoming-links ~ /^req/i
        ```

        ```
        satisfies+links ~ /^req/
        ```

   * **Set Operations:**
       ```
       tags in ["bug", "feature"]
       ```
