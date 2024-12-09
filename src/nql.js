const yargs = require("yargs");
const fs = require('fs');
const tc = require("./term-colors");
const read_needs = require("./nql_inc");
const colours = tc.colours;

function coloredText(text, color) {
    return colours.bright + colours.fg[color] + text + colours.reset;
}

function processInput(parser, config, filterExpression, executeFilter, mpf) {
    let ret = 0;
    try {
        let AST=read_needs.parse_input(parser,config,filterExpression);
        let counter = 0;
        if (executeFilter) {
            let out = {};
            for (const node of network_init_data['nodes']) {
                if (read_needs.custom_filter(node, AST)) {
                    counter += 1;
                    out[node.id] = node.data;
                    if (mpf !== -1 && counter >= mpf)
                        break;
                }
            }
            console.log(JSON.stringify({ counter: counter, needs: out }));
        }
    } catch (error) {
        console.log(`${coloredText(filterExpression, 'red')} -> ${error}`);
        ret = 1;
    }
    return ret;
}

function main(network_init_data, filterExpression, executeFilter=true, verbose=false, traceParser=false, mpf=-1) {
    const parser = read_needs.prepareParser(traceParser);
    if (network_init_data && 'gnodes' in network_init_data) {
        const gnodes = network_init_data['gnodes'];
        let keys = Object.keys(gnodes);
        if (keys.length > 0) {
            const firstKey = keys[0];
            const config = {
                verbose: verbose,
                sphinx_needs: gnodes[firstKey]
            };
            processInput(parser, config, filterExpression, executeFilter, mpf);
        }
    }
}

function truncateString(str, n) {
    if (str.length > n)
        return str.substring(0, n) + "...";
    else
        return str;
}

yargs(process.argv.slice(2))
    .scriptName("nql")
    .usage('$0 [args]')
    .strict()
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Enable verbose output, providing details about the process.',
        default: false
    })
    .option('trace', {
        alias: 't',
        type: 'boolean',
        description: 'Print details of the parsing process.',
        default: false
    })
    .option('attributes', {
        alias: 'a',
        type: 'boolean',
        description: 'Show Sphinx-Needs attributes and exit',
        default: false
    })
    .option('max-passed-filters', {
        alias: 'mpf',
        type: 'Integer',
        description: 'Limit the maximum number of nodes retrieved based on the filter criteria.',
        default: -1
    })
    .option('execute-filter', {
        alias: 'x',
        type: 'boolean',
        description: 'Process Sphinx-Needs data using the given input filter.',
        default: true
    })
    .positional('filter', {
        describe: 'Input Sphinx-Needs data filter (required)',
        type: 'string',
        demandOption: true,
    })
    .positional('filename', {
        describe: 'Path to the input file (required)',
        type: 'string',
        demandOption: true,
    })
    .describe("help", "Show help.")
    .epilog("copyright 2024")
    .version('1.0.0')
    .describe("version", "Show version number.")
    .alias('version', 'v')
    .help()
    .alias('help', 'h')
    .demandCommand(2, 'Error: You must specify both <filter> and <filename>.')
    .argv

argv = yargs.parse();

const filterExpression = argv._[0];
const filename = argv._[1];

fs.readFile(filename, 'utf8', function (err, data) {
    if (err) throw err;
    network_init_data = read_needs.processJSON(JSON.parse(data), argv.verbose);
    if (argv.a && network_init_data['nodes'].length > 0) {
        Object.entries(network_init_data['nodes'][0].data).forEach(([k, v]) => {
            console.log(`${k.padEnd(15, ' ')} -> ${truncateString(v, 60)}`);
        })
    }
    else
        main(network_init_data, filterExpression, executeFilter=argv.x, verbose=argv.verbose, traceParser=argv.trace, mpf=argv.mpf);
});
