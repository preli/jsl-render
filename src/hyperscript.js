"use strict";
exports.__esModule = true;
function h(componentOrTag, attrOrContent, children) {
    if (componentOrTag.render != null) {
        return componentOrTag;
    }
    var result = {
        tag: componentOrTag
    };
    if (typeof attrOrContent === "string") {
        result.content = attrOrContent;
    }
    else if (attrOrContent.length != null) {
        result.children = attrOrContent;
    }
    else {
        result.attr = attrOrContent;
        if (children != null) {
            result.children = children;
        }
    }
    return result;
}
exports.h = h;
