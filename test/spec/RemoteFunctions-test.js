/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, evil: true */
/*global $, define, describe, it, xit, expect, beforeEach, afterEach, waitsFor, waitsForDone, runs, window */

define(function (require, exports, module) {
    'use strict';
    
    var RemoteFunctions     = require("text!LiveDevelopment/Agents/RemoteFunctions.js"),
        SpecRunnerUtils     = require("spec/SpecRunnerUtils");
    
    // "load" RemoteFunctions
    RemoteFunctions = eval("(" + RemoteFunctions.trim() + ")()");
    
    // test cases
    // empty element
    var EMPTY_ELEMENT = '<div data-brackets-id="10"/>';
    
    // one child
    var ONE_CHILD_ELEMENT = '<div data-brackets-id="20"><div data-brackets-id="21"></div></div>';
    
    // two children
    var TWO_CHILD_ELEMENTS = '<div data-brackets-id="30"><div data-brackets-id="31"></div><div data-brackets-id="32"></div></div>';
    
    // text node
    var ONE_TEXT_NODE = '<div data-brackets-id="40">foo</div>';

    // comment node
    var ONE_COMMENT_NODE = '<div data-brackets-id="41"><!-- foo --></div>';
    
    // mixed text and comment nodes
    var MIXED_COMMENT_FIRST  = '<div data-brackets-id="50"><!--code--> the web</div>';
    var MIXED_COMMENT_SECOND = '<div data-brackets-id="51">code <!--the--> web</div>';
    var MIXED_COMMENT_THIRD  = '<div data-brackets-id="52">code the <!--web--></div>';
    
    // mixed text and element nodes
    var MIXED_ELEMENT_FIRST  = '<div data-brackets-id="60"><em data-brackets-id="61">code</em> the web</div>';
    var MIXED_ELEMENT_SECOND = '<div data-brackets-id="62">code <em data-brackets-id="63">the</em> web</div>';
    var MIXED_ELEMENT_THIRD  = '<div data-brackets-id="64">code the <em data-brackets-id="65">web</em></div>';
    var MIXED_ELEMENT_BEFORE_AFTER = '<div data-brackets-id="66"><em data-brackets-id="67">c</em>ode <em data-brackets-id="68">t</em>he <em data-brackets-id="69">w</em>eb</div>';
    
    // empty table
    var TABLE_EMPTY = '<table data-brackets-id="70"/>';
    
    // table with implicit tbody
    var TABLE_IMPLICIT_TBODY = '<table data-brackets-id="80"><tr data-brackets-id="81"><td data-brackets-id="82">foo</td></tr></table>';
    
    // table with explicit tbody
    var TABLE_EXPLICIT_TBODY = '<table data-brackets-id="90"><tbody data-brackets-id="91"><tr data-brackets-id="92"><td data-brackets-id="93">foo</td></tr></tbody></table>';
    
    // attr
    var ATTR_SIMPLE = '<div data-brackets-id="100" class="foo"></div>';
    
    describe("RemoteFunctions", function () {
        
        describe("DOMEditHanlder", function () {
            
            var htmlDocument,
                editHandler,
                tagID = 1000;
    
            function queryBracketsID(id) {
                if (!id) {
                    return null;
                }
                
                var result = htmlDocument.querySelectorAll("[data-brackets-id=\"" + id + "\"]");
                return result && result[0];
            }
            
            function getTargetElement(edit) {
                var targetID = edit.type.match(/textReplace|textDelete|textInsert|elementInsert/) ? edit.parentID : edit.tagID;
                return queryBracketsID(targetID);
            }
            
            beforeEach(function () {
                htmlDocument = window.document.implementation.createHTMLDocument();
                editHandler = new RemoteFunctions.DOMEditHandler(htmlDocument);
                
                this.addMatchers({
                    toHaveEdit: function (edit, parentClone) {
                        var msgArray    = [],
                            target      = getTargetElement(edit),
                            child,
                            before      = queryBracketsID(edit.beforeID),
                            after       = queryBracketsID(edit.afterID);
                        
                        this.message = function () {
                            return msgArray.toString();
                        };
                        
                        if (edit.type === "elementInsert") {
                            // elementInsert tagID assignment
                            child = queryBracketsID(edit.tagID);
                            
                            if (!child || child.parentNode !== target || (edit._isImplicit && child.parentNode.parentNode !== target)) {
                                msgArray.push("Could not find new child element \"" + edit.tag + "\" of parentID " + edit.parentID);
                            }
                        } else if (edit.type.match(/textReplace|textInsert/)) {
                            // text node content
                            child = (edit.firstChild && target.firstChild) ||
                                (edit.lastChild && target.lastChild) ||
                                (before && before.previousSibling) ||
                                (after && after.nextSibling) ||
                                (!edit.lastChild && target.lastChild);
                            
                            if (child.nodeValue !== edit.content) {
                                msgArray.push("Expected text node \"" + child.nodeValue + "\" to have content: \"" + edit.content + "\"");
                            }
                        }
                        
                        // FIXME implicit open tag
//                        if (edit.type.match(/textDelete|elementDelete/)) {
//                            // childNodes count delete
//                            if (target.childNodes.length !== parentClone.childNodes.length - 1) {
//                                msgArray.push("Expected childNodes to decrement by 1");
//                            }
//                        } else if (edit.type.match(/elementInsert|textInsert/)) {
//                            // childNodes count insert
//                            if (target.childNodes.length !== parentClone.childNodes.length + 1) {
//                                msgArray.push("Expected childNodes to increment by 1");
//                            }
//                        }
                        
                        if (edit.type.match(/elementInsert|textInsert|textReplace/)) {
                            // child position
                            if (edit.firstChild && target.firstChild !== child) {
                                msgArray.push("expected new node as firstChild");
                            }
                            
                            if (edit.lastChild && target.lastChild !== child) {
                                msgArray.push("elementInsert expected new node as lastChild");
                            }
                            
                            if (edit.beforeID && before.previousSibling !== child) {
                                msgArray.push("elementInsert expected new node before beforeID=" + edit.beforeID);
                            }
                            
                            if (edit.afterID && after.nextSibling !== child) {
                                msgArray.push("elementInsert expected new node after afterID=" + edit.afterID);
                            }
                        }
                        
                        return msgArray.length === 0;
                    }
                });
            });
            
            afterEach(function () {
                htmlDocument = null;
                editHandler = null;
            });
            
            function applyEdit(fixtureHTML, edit, expected) {
                var parent,
                    parentClone,
                    targetElement,
                    fixture = $(fixtureHTML)[0];
                
                // add content to document body
                htmlDocument.body.appendChild(fixture);
                
                if (edit.type === "elementInsert") {
                    edit.tagID = tagID;
                }
                
                edit.attributes = edit.attributes || {};
                
                // clone the parent before making changes to compare
                if (edit.parentID) {
                    parent = queryBracketsID(edit.parentID);
                    
                    if (parent) {
                        parentClone = $(parent).clone()[0];
                    }
                }
                
                // DOM element compare
                targetElement = getTargetElement(edit);
                
                if (edit.type === "elementDelete") {
                    targetElement = targetElement.parentNode;
                }
            
                editHandler.apply([edit]);
                expect(htmlDocument).toHaveEdit(edit, parentClone);
                
                if (expected) {
                    expect(targetElement.outerHTML).toBe(expected);
                }
                
                fixture.remove();
            }
            
            describe("Element edits", function () {
                
                it("should support elementInsert", function () {
                    /* empty parent */
                    applyEdit(EMPTY_ELEMENT, {
                        parentID: 10,
                        type: "elementInsert",
                        tag:  "span"
                    }, '<div data-brackets-id="10"><span data-brackets-id="1000"></span></div>');
                    
                    /* firstChild */
                    applyEdit(ONE_CHILD_ELEMENT, {
                        parentID: 20,
                        type: "elementInsert",
                        tag:  "span",
                        firstChild: true
                    }, '<div data-brackets-id="20"><span data-brackets-id="1000"></span><div data-brackets-id="21"></div></div>');
                    
                    /* lastChild */
                    applyEdit(ONE_CHILD_ELEMENT, {
                        parentID: 20,
                        type: "elementInsert",
                        tag:  "span",
                        lastChild: true,
                        attributes: []
                    }, '<div data-brackets-id="20"><div data-brackets-id="21"></div><span data-brackets-id="1000"></span></div>');
                    
                    /* beforeID */
                    applyEdit(TWO_CHILD_ELEMENTS, {
                        parentID: 30,
                        beforeID: 32,
                        type: "elementInsert",
                        tag:  "span"
                    }, '<div data-brackets-id="30"><div data-brackets-id="31"></div><span data-brackets-id="1000"></span><div data-brackets-id="32"></div></div>');
                    
                    /* afterID */
                    applyEdit(MIXED_ELEMENT_FIRST, {
                        parentID: 60,
                        afterID: 61,
                        type: "elementInsert",
                        tag:  "span"
                    }, '<div data-brackets-id="60"><em data-brackets-id="61">code</em><span data-brackets-id="1000"></span> the web</div>');
                });
                
                // FIXME lastChild might need afterID instead for implicit open?
                xit("should support elementInsert when the implicit tag and children both do not exist", function () {
                    /* empty table */
                    applyEdit(TABLE_EMPTY, {
                        parentID: 70,
                        type: "elementInsert",
                        tag:  "tr",
                        firstChild: true
                    }, '<table data-brackets-id="70"><tr data-brackets-id="1000"></tr></table>');
                });

                // FIXME lastChild might need afterID instead for implicit open?
                xit("should support elementInsert when the implicit tag is hidden but a child exists", function () {
                    /* implicit tbody */
                    applyEdit(TABLE_IMPLICIT_TBODY, {
                        parentID: 80,
                        type: "elementInsert",
                        tag:  "tr",
                        lastChild: true,
                        _isImplicit: true
                    }, '<table data-brackets-id="80"><tbody><tr data-brackets-id="81"><td data-brackets-id="82">foo</td></tr><tr data-brackets-id="1000"></tr></tbody></table>');
                });

                it("should support elementInsert for implicit open tags that appear in the DOM", function () {
                    /* explicit tbody */
                    applyEdit(TABLE_EXPLICIT_TBODY, {
                        parentID: 91,
                        type: "elementInsert",
                        tag:  "tr",
                        lastChild: true
                    }, '<tbody data-brackets-id="91"><tr data-brackets-id="92"><td data-brackets-id="93">foo</td></tr><tr data-brackets-id="1000"></tr></tbody>');
                });
                
                it("should support elementDelete", function () {
                    /* mixed content, element-text */
                    applyEdit(MIXED_ELEMENT_FIRST, {
                        tagID: 61,
                        type: "elementDelete"
                    }, '<div data-brackets-id="60"> the web</div>');
                    
                    /* mixed content, text-element-text */
                    applyEdit(MIXED_ELEMENT_SECOND, {
                        tagID: 63,
                        type: "elementDelete"
                    }, '<div data-brackets-id="62">code  web</div>');
                    
                    /* mixed content, text-element */
                    applyEdit(MIXED_ELEMENT_THIRD, {
                        tagID: 65,
                        type: "elementDelete"
                    }, '<div data-brackets-id="64">code the </div>');
                });
                
            });
            
            describe("Attribute edits", function () {
                
                it("should support attrAdd", function () {
                    applyEdit(EMPTY_ELEMENT, {
                        type: "attrAdd",
                        tagID: 10,
                        attribute: "class",
                        value: "foo"
                    }, '<div data-brackets-id="10" class="foo"></div>');
                });
                
                it("should support attrChange", function () {
                    applyEdit(ATTR_SIMPLE, {
                        type: "attrChange",
                        tagID: 100,
                        attribute: "class",
                        value: "bar"
                    }, '<div data-brackets-id="100" class="bar"></div>');
                });
                
                it("should support attrDel", function () {
                    applyEdit(ATTR_SIMPLE, {
                        type: "attrDel",
                        tagID: 100,
                        attribute: "class"
                    }, '<div data-brackets-id="100"></div>');
                });
                
            });
            
            describe("Text edits", function () {
                
                it("should support textInsert", function () {
                    applyEdit(EMPTY_ELEMENT, {
                        type: "textInsert",
                        content: "foo",
                        parentID: 10
                    }, '<div data-brackets-id="10">foo</div>');
                });
                
                it("should support textReplace", function () {
                    applyEdit(ONE_TEXT_NODE, {
                        type: "textReplace",
                        content: "bar",
                        parentID: 40
                    }, '<div data-brackets-id="40">bar</div>');

                });
                
                it("should support textDelete", function () {
                    applyEdit(ONE_TEXT_NODE, {
                        type: "textDelete",
                        parentID: 40
                    }, '<div data-brackets-id="40"></div>');
                });
                
            });
            
            describe("Working with text and elements", function () {
                
                it("should support textInsert with elements", function () {
                    applyEdit(MIXED_ELEMENT_FIRST, {
                        type: "textInsert",
                        content: "x",
                        parentID: 60,
                        beforeID: 61
                    }, '<div data-brackets-id="60">x<em data-brackets-id="61">code</em> the web</div>');

                    applyEdit(MIXED_ELEMENT_THIRD, {
                        type: "textInsert",
                        content: "x",
                        parentID: 64,
                        afterID: 65
                    }, '<div data-brackets-id="64">code the <em data-brackets-id="65">web</em>x</div>');
                });
                
                it("should support textDelete with elements", function () {
                    applyEdit(MIXED_ELEMENT_FIRST, {
                        type: "textDelete",
                        parentID: 60,
                        afterID: 61
                    }, '<div data-brackets-id="60"><em data-brackets-id="61">code</em></div>');

                    applyEdit(MIXED_ELEMENT_SECOND, {
                        type: "textDelete",
                        parentID: 62,
                        beforeID: 63
                    }, '<div data-brackets-id="62"><em data-brackets-id="63">the</em> web</div>');

                    applyEdit(MIXED_ELEMENT_SECOND, {
                        type: "textDelete",
                        parentID: 62,
                        afterID: 63
                    }, '<div data-brackets-id="62">code <em data-brackets-id="63">the</em></div>');

                    applyEdit(MIXED_ELEMENT_THIRD, {
                        type: "textDelete",
                        parentID: 64,
                        beforeID: 65
                    }, '<div data-brackets-id="64"><em data-brackets-id="65">web</em></div>');

                    applyEdit(MIXED_ELEMENT_BEFORE_AFTER, {
                        type: "textDelete",
                        parentID: 66,
                        afterID: 67,
                        beforeID: 68
                    }, '<div data-brackets-id="66"><em data-brackets-id="67">c</em><em data-brackets-id="68">t</em>he <em data-brackets-id="69">w</em>eb</div>');

                    applyEdit(MIXED_ELEMENT_BEFORE_AFTER, {
                        type: "textDelete",
                        parentID: 66,
                        afterID: 68,
                        beforeID: 69
                    }, '<div data-brackets-id="66"><em data-brackets-id="67">c</em>ode <em data-brackets-id="68">t</em><em data-brackets-id="69">w</em>eb</div>');
                });
                
                it("should support textReplace with elements", function () {
                    applyEdit(MIXED_ELEMENT_FIRST, {
                        type: "textReplace",
                        parentID: 60,
                        afterID: 61,
                        content: " BRACKETS"
                    }, '<div data-brackets-id="60"><em data-brackets-id="61">code</em> BRACKETS</div>');

                    applyEdit(MIXED_ELEMENT_SECOND, {
                        type: "textReplace",
                        parentID: 62,
                        beforeID: 63,
                        content: "BRACKETS "
                    }, '<div data-brackets-id="62">BRACKETS <em data-brackets-id="63">the</em> web</div>');

                    applyEdit(MIXED_ELEMENT_SECOND, {
                        type: "textReplace",
                        parentID: 62,
                        afterID: 63,
                        content: " BRACKETS"
                    }, '<div data-brackets-id="62">code <em data-brackets-id="63">the</em> BRACKETS</div>');

                    applyEdit(MIXED_ELEMENT_THIRD, {
                        type: "textReplace",
                        parentID: 64,
                        beforeID: 65,
                        content: "BRACKETS "
                    }, '<div data-brackets-id="64">BRACKETS <em data-brackets-id="65">web</em></div>');

                    applyEdit(MIXED_ELEMENT_BEFORE_AFTER, {
                        type: "textReplace",
                        parentID: 66,
                        afterID: 67,
                        beforeID: 68,
                        content: "BRACKETS "
                    }, '<div data-brackets-id="66"><em data-brackets-id="67">c</em>BRACKETS <em data-brackets-id="68">t</em>he <em data-brackets-id="69">w</em>eb</div>');

                    applyEdit(MIXED_ELEMENT_BEFORE_AFTER, {
                        type: "textReplace",
                        parentID: 66,
                        afterID: 68,
                        beforeID: 69,
                        content: "BRACKETS "
                    }, '<div data-brackets-id="66"><em data-brackets-id="67">c</em>ode <em data-brackets-id="68">t</em>BRACKETS <em data-brackets-id="69">w</em>eb</div>');
                });
                
            });
            
            describe("Working with text and comments", function () {
                
                it("should support textInsert with comments", function () {
                    applyEdit(ONE_COMMENT_NODE, {
                        type: "textInsert",
                        content: "bar",
                        parentID: 41
                    }, '<div data-brackets-id="41"><!-- foo -->bar</div>');
                });
                
                it("should support textReplace with comments", function () {
                    applyEdit(MIXED_COMMENT_FIRST, {
                        type: "textReplace",
                        content: "x the web",
                        parentID: 50
                    }, '<div data-brackets-id="50">x the web</div>');

                    applyEdit(MIXED_COMMENT_SECOND, {
                        type: "textReplace",
                        content: "code x web",
                        parentID: 51
                    }, '<div data-brackets-id="51">code x web</div>');

                    applyEdit(MIXED_COMMENT_THIRD, {
                        type: "textReplace",
                        content: "code the x",
                        parentID: 52
                    }, '<div data-brackets-id="52">code the x</div>');
                });
                
                it("should support textDelete with comments", function () {
                    applyEdit(MIXED_COMMENT_FIRST, {
                        type: "textDelete",
                        parentID: 50
                    }, '<div data-brackets-id="50"></div>');

                    applyEdit(MIXED_COMMENT_SECOND, {
                        type: "textDelete",
                        parentID: 51
                    }, '<div data-brackets-id="51"></div>');

                    applyEdit(MIXED_COMMENT_THIRD, {
                        type: "textDelete",
                        parentID: 52
                    }, '<div data-brackets-id="52"></div>');
                });
                
            });
            
        });
        
    });
});