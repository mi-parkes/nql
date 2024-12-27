from os import makedirs, path
import json
from jinja2 import Environment, FileSystemLoader
import  argparse

def render(config,ofilename,template_filename):
    outdir = "./"
    ofile = path.join(outdir,ofilename)

    if path.exists(ofile):
        raise FileExistsError(f"Output file '{ofile}' already exists.")
    environment = Environment(
        loader=FileSystemLoader("./")
    )

    ifile = environment.get_template(template_filename)

    if "needs_extra_links" in config:
        print(config["needs_extra_links"])
    link_types = ["links"]
    for item in config.get("needs_extra_links",[]):
        if "option" in item:
            link_types.append(item["option"])
    needs_extra_options = config.get("needs_extra_options", [])
    type_color_map = {}
    for item in getattr(config, "needs_types", []):
        if ("directive" in item) and ("color" in item):
            type_color_map[item["directive"]] = item["color"]
    filters = []
    valid_linkage = {}
    valid_linkage_color = "black"
    invalid_linkage_color = "red"

    if "filters" in config:
        filters = config["filters"]
    if "valid-linkage" in config:
        valid_linkage = config["valid-linkage"]
    if "invalid-linkage-color" in config:
        invalid_linkage_color = config["invalid-linkage-color"]
    if "valid-linkage-color" in config:
        valid_linkage_color = config["valid-linkage-color"]

    context = {
        "LINK_TYPES": link_types,
        "TYPE2COLOR": type_color_map,
        "FILTERS": filters,
        "VALID_LINKAGE": valid_linkage,
        "EXTRA_OPTIONS": needs_extra_options,
        #"VERSION": "1.0.0",
        "VALID_LINKAGE_COLOR": valid_linkage_color,
        "INVALID_LINKAGE_COLOR": invalid_linkage_color,
    }

    with open(ofile, "w+") as out:
        out.write(ifile.render(context))

verbose = False

parser = argparse.ArgumentParser(description='Generates html file from template')
parser.add_argument('config') 
parser.add_argument("--template",
                    dest='template',
                    default='test-template.html',
                    type=str)
parser.add_argument("--ofilename",
                    dest='ofilename',
                    default='test.html',
                    type=str)
args = parser.parse_args()

config_filename = args.config
with open(config_filename) as f:
    data = json.load(f)
    if verbose:
        print(data)
    render(data,args.ofilename,args.template)
