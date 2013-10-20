/**
 * Processor function that matches parsed <code>AbbreviationNode</code>
 * against resources defined in <code>resource</code> module
 */ 
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var resources = require('../../assets/resources');
	var elements = require('../../assets/elements');
	var parser = require('../abbreviation');
	var emmet = require('../../emmet');

	/**
	 * Finds matched resources for child nodes of passed <code>node</code> 
	 * element. A matched resource is a reference to <i>snippets.json</i> entry
	 * that describes output of parsed node 
	 * @param {AbbreviationNode} node
	 * @param {String} syntax
	 */
	function matchResources(node, syntax) {
		// do a shallow copy because the children list can be modified during
		// resource matching
		_.each(_.clone(node.children), /** @param {AbbreviationNode} child */ function(child) {
			var r = resources.getMatchedResource(child, syntax);
			if (_.isString(r)) {
				child.data('resource', elements.create('snippet', r));
			} else if (elements.is(r, 'reference')) {
				// it’s a reference to another abbreviation:
				// parse it and insert instead of current child
				/** @type AbbreviationNode */
				var subtree = parser.parse(r.data, {
					syntax: syntax
				});
				
				// if context element should be repeated, check if we need to 
				// transfer repeated element to specific child node
				if (child.repeatCount > 1) {
					var repeatedChildren = subtree.findAll(function(node) {
						return node.hasImplicitRepeat;
					});
					
					_.each(repeatedChildren, function(node) {
						node.repeatCount = child.repeatCount;
						node.hasImplicitRepeat = false;
					});
				}
				
				// move child‘s children into the deepest child of new subtree
				var deepestChild = subtree.deepestChild();
				if (deepestChild) {
					_.each(child.children, function(c) {
						deepestChild.addChild(c);
					});
				}
				
				// copy current attributes to children
				_.each(subtree.children, function(node) {
					_.each(child.attributeList(), function(attr) {
						node.attribute(attr.name, attr.value);
					});
				});
				
				child.replace(subtree.children);
			} else {
				child.data('resource', r);
			}
			
			matchResources(child, syntax);
		});
	}
	
	return {
		postprocessor: function(tree, options) {
			var syntax = options.syntax || emmet.defaultSyntax();
			matchResources(tree, syntax);
		}
	};
});