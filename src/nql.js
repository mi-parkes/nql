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
        let AST = read_needs.parse_input(parser, config, filterExpression);
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
            const data = network_init_data['data']['versions'][network_init_data['version']];
            data['needs'] = out;
            data['needs_amount'] = counter;
            console.log(JSON.stringify(network_init_data['data']));
        }
    } catch (error) {
        console.log(`${coloredText(filterExpression, 'red')} -> ${error}`);
        ret = 1;
    }
    return ret;
}

function main(network_init_data, filterExpression, executeFilter = true, verbose = false, traceParser = false, mpf = -1) {
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
    .option('diagnostics', {
        alias: 'dia',
        type: 'boolean',
        description: 'Performance Profiling',
        default: true
    })
    .option('needs-extras', {
        alias: 'ne',
        type: 'string',
        description: 'JSON file that contains needs_extra_links and/or needs_extra_options',
        default: null
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

function readFileJsonFile(filename) {
    let jsonData = null;
    try {
        let data = fs.readFileSync(filename, 'utf8');
        jsonData = JSON.parse(data);
    }
    catch (error) {
        console.error(`Failed to read file: ${filename} -> ${error}`);
        throw error;
    }
    return jsonData;
}

let needs_extras = null;
let needs_extra_links = null;
let needs_extra_options = null;
let needs_extra_version = null;

if (argv.ne) {
    needs_extras = readFileJsonFile(argv.ne);
    if (needs_extras) {
        needs_extra_links = 'needs_extra_links' in needs_extras ? needs_extras.needs_extra_links.map(link => link.option) : null;
        needs_extra_options = 'needs_extra_options' in needs_extras ? needs_extras.needs_extra_options : null;
        needs_extra_version = 'version' in needs_extras ? needs_extras.version : null;
        valid_linkage = 'valid-linkage' in needs_extras ? needs_extras['valid-linkage'] : null;
        valid_linkage_ignore = 'valid-linkage-ignore' in needs_extras ? needs_extras['valid-linkage-ignore'] : null;
        if (valid_linkage_ignore && needs_extra_links) {
            for(const ignore of valid_linkage_ignore)
                needs_extra_links = needs_extra_links.filter(e => e !== ignore);
        }
    }
    //  console.error(read_needs.prettyJ(needs_extra_options['needs_extra_options']));
}

if(argv.dia)
    read_needs.memoryConsumption('Before execution of readFileJsonFile():');

let needs = readFileJsonFile(filename);
if (needs) {
    const np = new read_needs.NeedsParser();
    network_init_data = np.processJSON(needs,
        argv.verbose,
        needs_extra_links,
        needs_extra_options,
        needs_extra_version,
        valid_linkage,
        true
    );
    needs=null;
    if (argv.a && network_init_data['nodes'].length > 0) {
        const data = network_init_data['nodes'][0].data;
        for (const k of Object.keys(data).sort())
            console.log(`${k.padEnd(15, ' ')} -> ${truncateString(data[k], 60)}`);
    }
    else {
        const timer = argv.dia ? new read_needs.Timer() : null;
        if (timer) {
            timer.start();
            read_needs.memoryConsumption('Before execution of main():');
        }
        main(network_init_data,
            filterExpression,
            executeFilter = argv.x,
            verbose = argv.verbose,
            traceParser = argv.trace,
            mpf = argv.mpf);
        if (timer) {
            timer.stop('main()');
            read_needs.memoryConsumption('After execution of main():');
        }
    }
}
