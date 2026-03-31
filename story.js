// Created with Squiffy 5.1.3
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
                if ('@last' in squiffy.story.section.passages && squiffy.get('_turncount')>= squiffy.story.section.passageCount) {
                    squiffy.story.passage('@last');
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
		link = String(link);
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
	expr = expr.replace(/^(\w*\s*):=(.*)$/, (match,name,value) => (name + "=" + squiffy.ui.processText(value)));
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
			var incDecRegex = /^([\w]*)\s*([\+\-\*\/])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
				rhs = incDecMatch[3];
				if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
				rhs = parseFloat(rhs);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
				if (op == '*') {
					value *= rhs;
				}
				if (op == '/') {
					value /= rhs;
				}
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.hide(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.show(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
    if (section.clear) {
        squiffy.ui.clearScreen();
    }
    if (section.attributes) {
        var parts, options, processedLines = [];
        section.attributes.forEach(function(line) {
            if (parts = line.match(/^random\s*:\s*([\w,]+)\s*=\s*(.+)/i)) {
                options = parts[2].split("|");
                parts[1].split(",").forEach(function(attr) {
                    if (options.length) {
                        processedLines.push(attr + " = " + options.splice(Math.floor(Math.random() * options.length), 1)[0]);
                    } else {
                        processedLines.push("Not enough options for "+attr);
                    }
                });
            } else {
                processedLines.push(line);
            }
        });
        processAttributes(processedLines);
    }
    if (section.js) {
        section.js();
    }
};


    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        var masterSection = squiffy.story.sections[''];
        if (!passage && masterSection) passage = masterSection.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };
    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
	    currentSection.find('input').each(function () {
                set ($(this).data('attribute') || this.id, this.value);
                this.disabled = true;
	    });
		currentSection.find("[contenteditable]").each(function () {
                set ($(this).data('attribute') || this.id, this.innerHTML);
                this.disabled = true;
	    });
                currentSection.find('textarea').each(function () {
                set ($(this).data('attribute') || this.id, this.value);
                this.disabled = true;
	    });

	    }

        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
			else if (startsWith(text,'@') && !startsWith(text,'@replace')) {
				processAttributes(text.substring(1).split(","));
				return "";
			}
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);
			condition = condition.replace("<", "&lt;").replace(">", "&gt;");
            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

				if(startsWith(rhs,'@')) rhs=squiffy.get(rhs.substring(1));
				
                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;

squiffy.story.start = 'Bookmarklets';
squiffy.story.id = 'ba9e65e8b4';
squiffy.story.sections = {
	'_default': {
		'text': "<p><a href=\"https://textadventures.co.uk/submit/submitfile/dlu-gn9oyu65frxy7yaubw\">https://textadventures.co.uk/submit/submitfile/dlu-gn9oyu65frxy7yaubw</a></p>",
		'passages': {
		},
	},
	'Bookmarklets': {
		'clear': true,
		'text': "<h3 id=\"chinese-bookmarklets-and-tools-to-help-with-reading\">Chinese Bookmarklets and Tools to Help with Reading</h3>\n<ol>\n<li>Click here for help with <a class=\"squiffy-link link-section\" data-section=\"Bujian\" role=\"link\" tabindex=\"0\">paper texts</a>.</li>\n<li><p>Drag this bookmarklet to your bookmarks bar. When you click it, it will create a floating reference toolbar in most Chinese websites. Highlight some Chinese text and click one of the logos to automatically look it up in a new tab. <a href=\"{MenuBar}\">ZHDictMenu</a></p>\n</li>\n<li><p>Here&#39;s a <a href=\"{ReadingSpeed}\">ReadingSpeed</a> tool that helps you keep track of your reading speed.</p>\n</li>\n<li><p>Download and install this amazing <a href=\"https://github.com/jeffreyxuan/toneoz-font-pinyin-kai/raw/master/fonts/ttf/ToneOZ-Pinyin-Kai-Traditional.ttf\">pinyin font</a> by Jeffrey Xuan. This will allow the following bookmarklet to work.</p>\n</li>\n<li><p>This bookmarklet converts Traditional Chinese websites to characters with pinyin. Drag this bookmarklet to your bookmarks bar: <a href=\"{FontPinyin}\">Font Pinyin</a>. For devices that refuse to install new fonts, use this Web Font Bookmarklet instead: <a href=\"{PYWebFont}\">PYWebFont</a>.</p>\n</li>\n<li><p>In the box below, list all the Chinese Characters you know, or the ones you don&#39;t want pinyin for. No spaces or other symbols.</p>\n<textarea id=\"known\" style=\"width:100%\">的一是</textarea>\n</li>\n<li><p>Click to create your <a class=\"squiffy-link link-section\" data-section=\"MCBookmarklet\" role=\"link\" tabindex=\"0\">bookmarklet</a>. </p>\n</li>\n</ol>",
		'attributes': ["FontPinyin = javascript:(function(bookmarklets)%7Bfor(var i=0;i<bookmarklets.length;i++)%7Bvar code=bookmarklets%5Bi%5D.url;if(code.indexOf(%22javascript:%22)!=-1)%7Bcode=code.replace(%22javascript:%22,%22%22);eval(code)%7Delse%7Bcode=code.replace(/%5Es+%7Cs+$/g,%22%22);if(code.length%3E0)%7Bwindow.open(code)%7D%7D%7D%7D)(%5B%7Btitle:%22%22,url:%22javascript:(function()%7B const selectedFont=%5Cx27ToneOZ-Pinyin-Kai-Traditional%5Cx27;const all=document.getElementsByTagName(%5Cx27*%5Cx27);for(let i=0;i %3C all.length;i++)%7B all%5Bi%5D.style.setProperty(%5Cx27font-family%5Cx27,selectedFont,%5Cx27important%5Cx27);%7D %7D)();%22%7D,%7Btitle:%22%22,url:%22javascript:!function()%7B let html=document.body.innerHTML;let rules=%7B %5Cx22(%5B氓仔%5D)%5Cx22:%5Cx22$1&#917985;%5Cx22,%5Cx22(%5B%5E飽平共雍頤%5D)和(?!%5B好政諧平尚解%5D)%5Cx22:%5Cx22$1和&#917985;%5Cx22,%5Cx22附和%5Cx22:%5Cx22附和&#917986;%5Cx22,%5Cx22(%5B攪摻%5D)和%5Cx22:%5Cx22$1和&#917987;%5Cx22,%5Cx22和麵%5Cx22:%5Cx22和&#917990;麵%5Cx22,%5Cx22不(?=%5B是要在夠過會忿叫錯到動論用上下住四配認作見%5D)%5Cx22:%5Cx22不&#917985;%5Cx22,%5Cx22一切%5Cx22:%5Cx22一切&#917985;%5Cx22,%5Cx22一(?=%5B個切陣下項件副樣棟定%5D)%5Cx22:%5Cx22一&#917985;%5Cx22,%5Cx22一(?=%5B般些篇生本番招流班筆波種年開起身會時心封男女百會回同聲點%5D)%5Cx22:%5Cx22一&#917986;%5Cx22,%5Cx22了(?=不起%7C%5B解%5D)%5Cx22:%5Cx22了&#917985;%5Cx22,%5Cx22(不%7C沒完沒%7C%5B不了做幹麼%5D得)了%5Cx22:%5Cx22$1了&#917985;%5Cx22,%5Cx22(%5B%5E個%5D)個(?!%5B個體性子%5D)%5Cx22:%5Cx22$1個&#917985;%5Cx22,%5Cx22(%5B%5E莊兒分份電%5D)子%5Cx22:%5Cx22$1子&#917985;%5Cx22,%5Cx22因為%5Cx22:%5Cx22因為&#917985;%5Cx22,%5Cx22為(?=%5B了什%5D)%5Cx22:%5Cx22為&#917985;%5Cx22,%5Cx22什麼%5Cx22:%5Cx22什&#917986;麼%5Cx22,%5Cx22(什物%7C物什)%5Cx22:%5Cx22什&#917985;物%5Cx22,%5Cx22勞什子%5Cx22:%5Cx22勞什&#917985;子%5Cx22,%5Cx22家什%5Cx22:%5Cx22家什&#917985;%5Cx22,%5Cx22意思%5Cx22:%5Cx22意思&#917986;%5Cx22,%5Cx22相(?=%5B信繼看處似拒%5D)%5Cx22:%5Cx22相&#917985;%5Cx22,%5Cx22(%5B排銀%5D)行%5Cx22:%5Cx22$1行&#917985;%5Cx22,%5Cx22行(?=%5B業規%5D)%5Cx22:%5Cx22行&#917985;%5Cx22,%5Cx22都會%5Cx22:%5Cx22都&#917985;會%5Cx22,%5Cx22都會%5Cx22:%5Cx22都&#917985;會%5Cx22,%5Cx22(%5B寒暑%5D)假%5Cx22:%5Cx22$1假&#917985;%5Cx22,%5Cx22假(?=%5B期%5D)%5Cx22:%5Cx22假&#917985;%5Cx22,%5Cx22重(?=%5B組新建啟%5D)%5Cx22:%5Cx22重&#917985;%5Cx22,%5Cx22(%5B潦%5D)倒%5Cx22:%5Cx22$1倒&#917985;%5Cx22,%5Cx22倒(?=%5B閉下塌%5D)%5Cx22:%5Cx22倒&#917985;%5Cx22,%5Cx22(%5B覺過做賣買變住長寫死認坐懂想吃玩聽看彈%F3%A0%87%A1走逃%5D)得%5Cx22:%5Cx22$1得&#917985;%5Cx22,%5Cx22(%5B就必非總%5D)得%5Cx22:%5Cx22$1得&#917986;%5Cx22,%5Cx22得(?=%5B忍等走把%5D)%5Cx22:%5Cx22得&#917986;%5Cx22,%5Cx22([沉])地%5Cx22:%5Cx22$1地&#917985;%5Cx22,%5Cx22(%5B增司校院局成家村廠市店%5D)長%5Cx22:%5Cx22$1長&#917985;%5Cx22,%5Cx22長(?=%5B得大高%5D%7C知識)%5Cx22:%5Cx22長&#917985;%5Cx22,%5Cx22睡覺%5Cx22:%5Cx22睡覺&#917985;%5Cx22,%5Cx22(%5B滾音%5D)樂%5Cx22:%5Cx22$1樂&#917985;%5Cx22,%5Cx22樂(?=%5B團隊%5D)%5Cx22:%5Cx22樂&#917985;%5Cx22,%5Cx22(%5B幾一到遠四%5D)處%5Cx22:%5Cx22$1處&#917985;%5Cx22,%5Cx22幾乎%5Cx22:%5Cx22幾&#917985;乎%5Cx22,%5Cx22勉強%5Cx22:%5Cx22勉強&#917985;%5Cx22,%5Cx22高興%5Cx22:%5Cx22高興&#917985;%5Cx22,%5Cx22興趣%5Cx22:%5Cx22興&#917985;趣%5Cx22,%5Cx22坦率%5Cx22:%5Cx22坦率&#917985;%5Cx22,%5Cx22調(?=%5B查到子%F3%A0%87%A1動%5D)%5Cx22:%5Cx22調&#917985;%5Cx22,%5Cx22(%5B腔情%5D)調%5Cx22:%5Cx22$1調&#917985;%5Cx22,%5Cx22有朝一日%5Cx22:%5Cx22有朝&#917985;一日%5Cx22,%5Cx22大剌剌%5Cx22:%5Cx22大剌&#917985;剌&#917985;%5Cx22,%5Cx22朝食%5Cx22:%5Cx22朝&#917985;食%5Cx22,%5Cx22委曲求全%5Cx22:%5Cx22委曲&#917985;求全%5Cx22,%5Cx22張牙舞爪%5Cx22:%5Cx22張牙舞爪&#917987;%5Cx22,%5Cx22心寬體胖%5Cx22:%5Cx22心寬體胖&#917985;%5Cx22,%5Cx22自給自足%5Cx22:%5Cx22自給&#917985;自足%5Cx22,%5Cx22虛與委蛇%5Cx22:%5Cx22虛與委&#917985;蛇&#917985;%5Cx22,%5Cx22彷%5Cx22:%5Cx22彷&#917985;%5Cx22,%5Cx22彷&#917985;(?=%5B徨徉%5D)%5Cx22:%5Cx22彷%5Cx22,%5Cx22削弱%5Cx22:%5Cx22削&#917985;弱%5Cx22,%5Cx22瘦削%5Cx22:%5Cx22瘦削&#917985;%5Cx22,%5Cx22(%5B嫌可好厭%5D)惡%5Cx22:%5Cx22$1惡&#917985;%5Cx22,%5Cx22(叔%7C伯%7C婆%7C姑%7C娃%7C舅%7C姥%7C弟%7C哥%7C姊%7C姐%7C謝)%5C%5C%5C%5C1+%5Cx22:%5Cx22$1$1&#917985;%5Cx22,%5Cx22量杯%5Cx22:%5Cx22量&#917985;杯%5Cx22,%5Cx22(考%7C測)量%5Cx22:%5Cx22$1量&#917985;%5Cx22,%5Cx22商量%5Cx22:%5Cx22商量&#917986;%5Cx22,%5Cx22(%5B嘛嘍誒%5D)(?=%5B，。？！…%5D)%5Cx22:%5Cx22$1&#917985;%5Cx22,%5Cx22吧(?!%5B，。？！…%5D)%5Cx22:%5Cx22吧&#917985;%5Cx22,%5Cx22(%5B恐威恫%5D)嚇%5Cx22:%5Cx22$1嚇&#917985;%5Cx22,%5Cx22嚇阻%5Cx22:%5Cx22嚇&#917985;阻%5Cx22,%5Cx22(%5B上下%5D)載%5Cx22:%5Cx22$1載&#917985;%5Cx22,%5Cx22阿諛%5Cx22:%5Cx22阿&#917985;諛%5Cx22,%5Cx22不阿%5Cx22:%5Cx22不阿&#917985;%5Cx22,%5Cx22婀娜%5Cx22:%5Cx22婀娜&#917985;%5Cx22,%5Cx22率(%5B直先領%5D)%5Cx22:%5Cx22率&#917985;$1%5Cx22,%5Cx22(%5B輕草統%5D)率%5Cx22:%5Cx22$1率&#917985;%5Cx22,%5Cx22狼藉%5Cx22:%5Cx22狼藉&#917985;%5Cx22,%5Cx22撇(?=%5B開下清%5D)%5Cx22:%5Cx22撇&#917985;%5Cx22,%5Cx22(不%7C自)禁%5Cx22:%5Cx22$1禁&#917985;%5Cx22,%5Cx22前車(?=%5B之可覆%5D)%5Cx22:%5Cx22前車&#917985;%5Cx22,%5Cx22偏頗%5Cx22:%5Cx22偏頗&#917985;%5Cx22,%5Cx22(%5B交郵兼出調官%5D%7C開小)差%5Cx22:%5Cx22$1差&#917985;%5Cx22,%5Cx22差(?=%5B遣事役%5D)%5Cx22:%5Cx22差&#917985;%5Cx22,%5Cx22差(?=不多%7C%5B勁點%5D)%5Cx22:%5Cx22差&#917988;%5Cx22,%5Cx22參差%5Cx22:%5Cx22參&#917985;差&#917985;%5Cx22,%5Cx22投降%5Cx22:%5Cx22投降&#917985;%5Cx22,%5Cx22(%5B不正得睡%5D)著%5Cx22:%5Cx22$1著&#917987;%5Cx22,%5Cx22著(?=%5B亮迷想火%5D)%5Cx22:%5Cx22著&#917987;%5Cx22,%5Cx22著(?=%5B急涼%5D)%5Cx22:%5Cx22著&#917986;%5Cx22,%5Cx22(%5B%5E看讀%5D)著(?=%5B名作稱述書即%5D)%5Cx22:%5Cx22$1著&#917985;%5Cx22,%5Cx22(%5B土顯卓巨名%5D)著%5Cx22:%5Cx22$1著&#917985;%5Cx22,%5Cx22(%5B我他她妳你%5D)著手%5Cx22:%5Cx22$1著&#917988;手%5Cx22,%5Cx22著(?=%5B色裝地墨眼落實陸地%5D)%5Cx22:%5Cx22著&#917988;%5Cx22,%5Cx22(%5B執沉黏衣%5D)著%5Cx22:%5Cx22$1著&#917988;%5Cx22,%5Cx22一著(?!%5B%5C%5C%5C%5Cd%5D)%5Cx22:%5Cx22一著&#917986;%5Cx22,%5Cx22包紮%5Cx22:%5Cx22包紮&#917985;%5Cx22,%5Cx22彈(?=%5B鋼琴吉琵古性奏得力簧跳指%5D)%5Cx22:%5Cx22彈&#917985;%5Cx22,%5Cx22(%5B灰反%5D)彈%5Cx22:%5Cx22$1彈&#917985;%5Cx22,%5Cx22(%5B把將%5D(?!炸))彈%5Cx22:%5Cx22$1彈&#917985;%5Cx22,%5Cx22動彈%5Cx22:%5Cx22動彈&#917986;%5Cx22,%5Cx22將(?=%5B領兵%5D)%5Cx22:%5Cx22將&#917985;%5Cx22,%5Cx22(%5B大麻%5D)將%5Cx22:%5Cx22$1將&#917985;%5Cx22,%5Cx22脈脈%5Cx22:%5Cx22脈&#917985;脈&#917985;%5Cx22,%5Cx22乾(?=%5B坤道隆%5D)%5Cx22:%5Cx22乾&#917985;%5Cx22,%5Cx22(%5B承%5D)乾%5Cx22:%5Cx22$1乾&#917985;%5Cx22,%5Cx22藏(?=青)%5Cx22:%5Cx22藏&#917985;%5Cx22,%5Cx22(%5B寶西入%5D)藏%5Cx22:%5Cx22$1藏&#917985;%5Cx22,%5Cx22(%5B淹隱覆湮%5D)沒%5Cx22:%5Cx22$1沒&#917985;%5Cx22,%5Cx22沒(?=%5B光落收%5D%7C入水)%5Cx22:%5Cx22沒&#917985;%5Cx22,%5Cx22拾級%5Cx22:%5Cx22拾&#917985;級%5Cx22,%5Cx22雪茄%5Cx22:%5Cx22雪茄&#917985;%5Cx22,%5Cx22忖度%5Cx22:%5Cx22忖度&#917985;%5Cx22,%5Cx22骰%5Cx22:%5Cx22骰&#917985;%5Cx22,%5Cx22埋怨%5Cx22:%5Cx22埋&#917985;怨%5Cx22,%5Cx22(%5B豬牛羊%5D)圈%5Cx22:%5Cx22$1圈&#917985;%5Cx22,%5Cx22圈養%5Cx22:%5Cx22圈&#917985;養%5Cx22,%5Cx22(%5B填語搪堵%5D)塞%5Cx22:%5Cx22$1塞&#917985;%5Cx22,%5Cx22(%5B沮頹%5D)喪%5Cx22:%5Cx22$1喪&#917985;%5Cx22,%5Cx22咯咯咯%5Cx22:%5Cx22咯&#917985;咯&#917985;咯&#917985;%5Cx22,%5Cx22咯咯%5Cx22:%5Cx22咯&#917985;咯&#917985;%5Cx22,%5Cx22咯吱%5Cx22:%5Cx22咯&#917985;吱%5Cx22,%5Cx22(%5B包概%5D)括%5Cx22:%5Cx22$1括&#917985;%5Cx22,%5Cx22累累%5Cx22:%5Cx22累&#917985;累&#917985;%5Cx22,%5Cx22累(?=%5B加積及%5D)%5Cx22:%5Cx22累&#917985;%5Cx22,%5Cx22(%5B拖積%5D)累%5Cx22:%5Cx22$1累&#917985;%5Cx22,%5Cx22累贅%5Cx22:%5Cx22累&#917986;贅&#917985;%5Cx22,%5Cx22人質%5Cx22:%5Cx22人質&#917985;%5Cx22,%5Cx22遊說%5Cx22:%5Cx22遊說&#917988;%5Cx22,%5Cx22說(?=%5B客服%5D)%5Cx22:%5Cx22說&#917985;%5Cx22,%5Cx22尖沙咀%5Cx22:%5Cx22尖沙咀&#917985;%5Cx22,%5Cx22生還(?!%5B是沒%5D)%5Cx22:%5Cx22生還&#917985;%5Cx22,%5Cx22還(?=%5B擊原手%5D)%5Cx22:%5Cx22還&#917985;%5Cx22,%5Cx22拗(?=%5B口不%5D)%5Cx22:%5Cx22拗&#917985;%5Cx22,%5Cx22(違%7C執)拗%5Cx22:%5Cx22$1拗&#917985;%5Cx22,%5Cx22曲尺%5Cx22:%5Cx22曲&#917985;尺%5Cx22,%5Cx22蹣跚%5Cx22:%5Cx22蹣&#917985;跚%5Cx22,%5Cx22布匹%5Cx22:%5Cx22布匹&#917985;%5Cx22,%5Cx22瓦楞%5Cx22:%5Cx22瓦楞&#917985;%5Cx22,%5Cx22帆布%5Cx22:%5Cx22帆&#917985;布%5Cx22,%5Cx22省悟%5Cx22:%5Cx22省&#917985;悟%5Cx22,%5Cx22(%5B不反%5D)省%5Cx22:%5Cx22$1省&#917985;%5Cx22,%5Cx22啊喲%5Cx22:%5Cx22啊喲&#917985;%5Cx22,%5Cx22屏(?=%5B住著%5D氣%7C氣%7C息%7C退)%5Cx22:%5Cx22屏&#917985;%5Cx22,%5Cx22(%5B很全%5D)盛%5Cx22:%5Cx22$1盛&#917985;%5Cx22,%5Cx22盛(?=%5B開世%5D)%5Cx22:%5Cx22盛&#917985;%5Cx22,%5Cx22縫隙%5Cx22:%5Cx22縫&#917985;隙%5Cx22,%5Cx22鋪子%5Cx22:%5Cx22鋪&#917985;子%5Cx22,%5Cx22(%5B補供%5D)給%5Cx22:%5Cx22$1給&#917985;%5Cx22,%5Cx22給養%5Cx22:%5Cx22給&#917985;養%5Cx22,%5Cx22當(%5B真票%5D)%5Cx22:%5Cx22當&#917985;$1%5Cx22,%5Cx22典當%5Cx22:%5Cx22典當&#917985;%5Cx22,%5Cx22剝削%5Cx22:%5Cx22剝削&#917985;%5Cx22,%5Cx22引吭%5Cx22:%5Cx22引吭&#917985;%5Cx22,%5Cx22勒(?=%5B痕死住斃殺緊%5D)%5Cx22:%5Cx22勒&#917985;%5Cx22,%5Cx22捋%5Cx22:%5Cx22捋&#917985;%5Cx22,%5Cx22掙扎%5Cx22:%5Cx22掙扎&#917985;%5Cx22,%5Cx22一幢%5Cx22:%5Cx22一幢&#917985;%5Cx22,%5Cx22咀嚼%5Cx22:%5Cx22咀嚼&#917985;%5Cx22,%5Cx22勻稱%5Cx22:%5Cx22勻稱&#917985;%5Cx22,%5Cx22稱職%5Cx22:%5Cx22稱&#917985;職%5Cx22,%5Cx22一晃%5Cx22:%5Cx22一晃&#917985;%5Cx22,%5Cx22畜生%5Cx22:%5Cx22畜&#917985;生%5Cx22,%5Cx22(%5B家人%5D)畜%5Cx22:%5Cx22$1畜&#917985;%5Cx22,%5Cx22(%5B閒懶%5D)散%5Cx22:%5Cx22$1散&#917985;%5Cx22,%5Cx22扇動%5Cx22:%5Cx22扇&#917985;動%5Cx22,%5Cx22(%5B想要欲未%5D)扇%5Cx22:%5Cx22$1扇&#917985;%5Cx22,%5Cx22折騰%5Cx22:%5Cx22折&#917985;騰&#917985;%5Cx22,%5Cx22窩囊%5Cx22:%5Cx22窩囊&#917986;%5Cx22,%5Cx22呆在%5Cx22:%5Cx22待&#917985;在%5Cx22,%5Cx22待(?=不了|一會)%5Cx22:%5Cx22待&#917985;%5Cx22,%5Cx22蛤？%5Cx22:%5Cx22蛤&#917985;？%5Cx22,%5Cx22蛤蟆%5Cx22:%5Cx22蛤&#917985;蟆&#917985;%5Cx22,%5Cx22哀號%5Cx22:%5Cx22哀號&#917985;%5Cx22,%5Cx22(%5B適回反%5D)應%5Cx22:%5Cx22$1應&#917985;%5Cx22,%5Cx22刨(?=%5B%5E洞坑出掉除%5D)%5Cx22:%5Cx22刨&#917985;%5Cx22,%5Cx22殷紅%5Cx22:%5Cx22殷&#917986;紅%5Cx22,%5Cx22腹便便%5Cx22:%5Cx22腹便&#917985;便&#917985;%5Cx22,%5Cx22便(?=宜)%5Cx22:%5Cx22便&#917985;%5Cx22,%5Cx22紅暈%5Cx22:%5Cx22紅暈&#917985;%5Cx22,%5Cx22倔強%5Cx22:%5Cx22倔強&#917986;%5Cx22,%5Cx22嗚咽%5Cx22:%5Cx22嗚咽&#917985;%5Cx22,%5Cx22蠻橫%5Cx22:%5Cx22蠻橫&#917985;%5Cx22,%5Cx22拖拽%5Cx22:%5Cx22拖拽&#917986;%5Cx22,%5Cx22叨擾%5Cx22:%5Cx22叨&#917985;擾%5Cx22,%5Cx22列傳%5Cx22:%5Cx22列傳&#917985;%5Cx22,%5Cx22茅廁%5Cx22:%5Cx22茅廁&#917988;%5Cx22,%5Cx22綢繆%5Cx22:%5Cx22綢繆&#917985;%5Cx22,%5Cx22柔荑%5Cx22:%5Cx22柔荑&#917985;%5Cx22,%5Cx22櫛比%5Cx22:%5Cx22櫛比&#917985;%5Cx22,%5Cx22呢喃%5Cx22:%5Cx22呢&#917985;喃%5Cx22,%5Cx22的確%5Cx22:%5Cx22的&#917985;確%5Cx22,%5Cx22目的%5Cx22:%5Cx22目的&#917985;%5Cx22,%5Cx22答應%5Cx22:%5Cx22答應&#917985;%5Cx22,%5Cx22嘔吐%5Cx22:%5Cx22嘔吐&#917985;%5Cx22,%5Cx22角色%5Cx22:%5Cx22角&#917985;色%5Cx22,%5Cx22主角%5Cx22:%5Cx22主角&#917985;%5Cx22,%5Cx22畜牲%5Cx22:%5Cx22畜&#917985;牲%5Cx22,%5Cx22(%5B煩鬱苦%5D)悶%5Cx22:%5Cx22$1悶&#917985;%5Cx22,%5Cx22悶(?=%5B酒%5D)%5Cx22:%5Cx22悶&#917985;%5Cx22,%5Cx22中(?=%5B獎毒彈計%5D)%5Cx22:%5Cx22中&#917985;%5Cx22,%5Cx22(%5B災遇%5D)難%5Cx22:%5Cx22$1難&#917985;%5Cx22,%5Cx22咖哩%5Cx22:%5Cx22咖&#917985;哩%5Cx22,%5Cx22撒謊%5Cx22:%5Cx22撒&#917985;謊%5Cx22,%5Cx22好(?=%5B奇%5D)%5Cx22:%5Cx22好&#917985;%5Cx22,%5Cx22深圳%5Cx22:%5Cx22深圳&#917985;%5Cx22,%5Cx22(%5B喜癖偏%5D)好%5Cx22:%5Cx22$1好&#917985;%5Cx22,%5Cx22(%5B鑰鎖%5D)匙󠇡%5Cx22:%5Cx22$1匙󠇡&#917985;%5Cx22,,%5Cx22會計%5Cx22:%5Cx22會&#917985;計%5Cx22 %7D;let compiled=Object.entries(rules).map((%5Br,v%5D)=%3E%5Bnew RegExp(r,%5Cx22g%5Cx22),v%5D);for(let %5Bre,v%5D of compiled)%7B html=html.replace(re,v);%7D document.body.innerHTML=html;%7D();%22%7D%5D)","PYWebFont = javascript:(function() {var styleA = document.createElement('style'); styleA.textContent = %22@import url('https://cdn.jsdelivr.net/gh/IFforL2/Chinese-Bookmarklets-for-Reading@refs/heads/main/style2.css'); body {font-family: 'Pinyin01', cursive !important; }%22; document.head.appendChild(styleA); var elements = document.querySelectorAll('*'); for (var i = 0; i < elements.length; i++) {elements[i].style.fontFamily = 'Pinyin01';}})();","MyCharacters1 = javascript:!function(){for(var e=/[","MyCharacters2 = ]/g,r=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,!1);r.nextNode();){var n=r.currentNode;n.nodeValue=n.nodeValue.replace(e,function(e){return e+'%F3%A0%87%A0'})}}();","MenuBar = javascript:(function(){function createLink(href,imgSrc){var link=document.createElement('a');link.href=href;var img=document.createElement('img');img.src=imgSrc;img.width=40;link.appendChild(img);link.style.position='fixed';link.style.top='0px';link.style.overflow='auto';link.style.overflowX='hidden';link.style.zIndex='10000';link.onclick=function(event){event.preventDefault();var selectedText=document.getSelection().toString().replace(/[%F3%A0%87%A0%F3%A0%87%A1%F3%A0%87%A2%F3%A0%87%A3%F3%A0%87%A4%F3%A0%87%A5ˋˎ̀՝̌́̄]/g,'');var url=this.href.replace('SELECTION',encodeURIComponent(selectedText));window.open(url,'_blank');};return link;}var googleTranslateLink=createLink('https://translate.google.com/?sl=zh-TW&tl=en&text=SELECTION&op=translate#i15%27,%27https://upload.wikimedia.org/wikipedia/commons/d/db/Google_Translate_Icon.png%27);googleTranslateLink.style.left='8px';document.body.appendChild(googleTranslateLink);var mandarinSpotLink=createLink('https://mandarinspot.com/annotate?text=SELECTION&spaces&pr&vocab=6&sort=ord#content','https://pbs.twimg.com/profile_images/1437123668/mspot-128_400x400.png');mandarinSpotLink.style.left='48px';document.body.appendChild(mandarinSpotLink);var TWDictLink=createLink('https://dict.revised.moe.edu.tw/search.jsp?md=1&word=SELECTION#searchL','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2-ycj6PpM4HQ5P45arpizuZpsOvUWqUphrk87n7mb0RwA0AM8');TWDictLink.style.left='128px';document.body.appendChild(TWDictLink);var MDBGLink=createLink('https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=1&wdqtm=0&wdqcham=1&wdqt=SELECTION#wordlistlink','https://www.mdbg.net/logos/mdbg_500x500.png');MDBGLink.style.left='88px';document.body.appendChild(MDBGLink);var HZYLink=createLink('https://hanziyuan.net/#SELECTION','https://hanziyuan.net/images/favicons/logo.png');HZYLink.style.left='208px';document.body.appendChild(HZYLink);var HZCraftLink=createLink('https://www.zdic.net/hant/SELECTION#wljs','https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/4a/65/1a/4a651a2d-61ef-6011-e1ed-5f23b7cf0195/AppIcon-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg');HZCraftLink.style.left='168px';document.body.appendChild(HZCraftLink);var plusButton=document.createElement('a');var plusImg=document.createElement('img');plusImg.src='https://www.pngall.com/wp-content/uploads/10/Plus-Symbol-Silhouette-PNG-Clipart.png';plusImg.width=20;plusButton.appendChild(plusImg);plusButton.style.position='fixed';plusButton.style.top='0px';plusButton.style.left='248px';plusButton.style.cursor='pointer';plusButton.style.zIndex='10000';plusButton.onclick=function(){var elements=document.querySelectorAll('*');for(var i=0;i<elements.length;i++){var fontSize=window.getComputedStyle(elements[i]).fontSize;if(fontSize){var currentSize=parseFloat(fontSize);elements[i].style.fontSize=(currentSize+1)+'px';}}};document.body.appendChild(plusButton);var style=document.createElement('style');style.innerHTML='*{user-select: auto !important;} ::selection{background-color: yellow !important; color: black !important;}';document.head.appendChild(style);document.body.onselectstart=function(){return true;};document.body.onmousedown=function(){return true;};document.onkeydown=function(){return true;};document.oncopy=function(e){var selectedText=window.getSelection().toString();e.clipboardData.setData('text/plain',selectedText);e.preventDefault();};})();","HZCraft Component = javascript:(function(){var appearsInBoxes=document.querySelectorAll('.appearsinbox');var charactersMap={};appearsInBoxes.forEach(function(box){var characters=box.textContent.trim().split('');characters.forEach(function(char){if(!charactersMap[char]){charactersMap[char]=1}else{charactersMap[char]++}})});var commonCharacters=Object.keys(charactersMap).filter(function(char){return charactersMap[char]===appearsInBoxes.length});if(commonCharacters.length>0){alert('Common Characters: '+commonCharacters.join(', '))}else{alert('No common characters found.')}})();","TextAnalysis1 = javascript:(function(){ var chineseCharCount = 0; var knownCharCount = 0; var chineseRegex = /[\\u4e00-\\u9fa5]/g; var knownCharRegex = /\\uDB40\\uDDE0/g; var textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false); while (textNodes.nextNode()) { var node = textNodes.currentNode; if (node.nodeValue.match(chineseRegex)) { chineseCharCount += node.nodeValue.match(chineseRegex).length; } if (node.nodeValue.match(knownCharRegex)) { knownCharCount += node.nodeValue.match(knownCharRegex).length; } } var readability = (chineseCharCount > 0) ? ((knownCharCount / chineseCharCount) * 100).toFixed(1) : 0; var totalMinutes = (chineseCharCount > 0) ? chineseCharCount /","ReadingSpeed = javascript:!function(bookmarklets){for(var i=0;i<bookmarklets.length;i++){var code=bookmarklets[i].url;if(0===code.indexOf(%22javascript:%22)){code=code.replace(%22javascript:%22,%22%22);try{eval(code)}catch(e){console.error(%22Error executing bookmarklet:%22,e)}}else(code=code.trim()).length%3E0&&window.open(code)}}([{title:%22Scroll Percent Display%22,url:%22javascript:(function() {var container = document.createElement('div');container.style.position = 'fixed';container.style.top = '5px';container.style.right = '5px';container.style.zIndex = '10000';container.style.display = 'flex';container.style.gap = '15px';document.body.appendChild(container);var percentSpan = document.createElement('span');percentSpan.id = 'percent';percentSpan.textContent = '0%';container.appendChild(percentSpan);var originalTitle = document.title;function updateDisplay() {var scrollTop = window.scrollY;var docHeight = document.documentElement.scrollHeight;var winHeight = window.innerHeight;if (docHeight %3E winHeight) {var scrollPercent = ((scrollTop / (docHeight - winHeight)) *100).toFixed(1);percentSpan.textContent = scrollPercent + '%';document.title = '(' + scrollPercent + '%) ' + originalTitle;} else {percentSpan.textContent = '0%';document.title = '(0%) ' + originalTitle;}}window.addEventListener('scroll', updateDisplay);})();%22},{title:%22Timer%22,url:%22javascript:(function(){var container = document.createElement('div');container.style.position = 'fixed';container.style.top = '5px';container.style.right = '150px';container.style.zIndex = '10000';container.style.cursor = 'pointer';container.contentEditable = 'true';document.body.appendChild(container);var timeSpan = document.createElement('span');timeSpan.id = 'timer';timeSpan.textContent = '00:00';timeSpan.contentEditable = 'true';container.appendChild(timeSpan);var startTime = null;var elapsedTime = 0;var interval = null;container.addEventListener('click', function(){if(interval){clearInterval(interval);interval = null;elapsedTime += new Date().valueOf() - startTime;}else{var timeParts = timeSpan.textContent.split(':');elapsedTime = (parseInt(timeParts[0]) * 60 + parseInt(timeParts[1])) * 1000;startTime = new Date().valueOf();interval = setInterval(function(){var now = new Date().valueOf();var totalElapsed = elapsedTime + (now - startTime);var minutes = Math.floor(totalElapsed / 1000 / 60);var seconds = Math.floor((totalElapsed / 1000) % 60);timeSpan.textContent = (minutes < 10 ? %270%27 : %27%27) + minutes + %27:%27 + (seconds < 10 ? %270%27 : %27%27) + seconds;}, 1000);}})})();%22},{title:%22ETC%22,url:%22javascript:(function() {var container = document.createElement(%27div%27);container.style.position = %27fixed%27;container.style.top = %275px%27;container.style.right = %2780px%27;container.style.zIndex = %2710000%27;container.style.display = %27flex%27;container.style.gap = %2715px%27;document.body.appendChild(container);var etcSpan = document.createElement(%27span%27);etcSpan.id = %27%ETC%27;etcSpan.textContent = %270.0h%27;container.appendChild(etcSpan);function updateETC() {var percentSpan = document.getElementById(%27percent%27);if (percentSpan) {var scrollPercent = parseFloat(percentSpan.textContent.replace(%27%%27, %27%27));if (scrollPercent %3E 0) {var timeSpan = document.getElementById(%27timer%27);var timeParts = timeSpan.textContent.split(%27:%27);var minutes = parseInt(timeParts[0]) || 0;var seconds = parseInt(timeParts[1]) || 0;var totalMinutes = minutes + seconds / 60;var etc = (((totalMinutes / scrollPercent) * 100) - totalMinutes) / 60;etcSpan.textContent = (Math.round(etc * 10) / 10).toFixed(1) + %27h%27;}}}setInterval(updateETC, 1000);})();%22},{title:%22Disable F5 & F4%22,url:%22javascript:(function(){document.addEventListener(%27keydown%27, function(e){if(e.keyCode === 116 || e.keyCode === 115){e.preventDefault();}});})();%22}]);"],
		'js': function() {
			//@set FontPinyin = javascript:(function() {var elements = document.querySelectorAll('*'); for (var i = 0; i < elements.length; i++) {elements[i].style.fontFamily = 'ToneOZ-Pinyin-Kai-Traditional';}})();
		},
		'passages': {
		},
	},
	'MCBookmarklet': {
		'text': "<ol start=\"8\">\n<li><p>This will remove pinyin from the {familiar} characters that you already know. Drag this bookmarklet to your bookmarks bar: <a href=\"{MyCharacters}\">My Characters</a>. It may not sync with your mobile bookmarklets. In that case, <a class=\"squiffy-link link-passage\" data-passage=\"copy\" role=\"link\" tabindex=\"0\">copy</a> it to your clipboard and paste it into a mobile bookmarklet.</p>\n</li>\n<li><p>Not sure if a story or article is right for you? Input your {rotate:CPM:estimated Characters per minute} <input id=\"CPM\" placeholder=\"here\" type=\"number\" style=\"width: 40px;\">. Then Ctrl+A, Ctrl+C, Ctrl+V an entire extended text into the <a class=\"squiffy-link link-section\" data-section=\"next box\" role=\"link\" tabindex=\"0\">next box</a> to get a text analysis.</p>\n</li>\n</ol>",
		'attributes': ["knownRaw = @known","obsolete = 丂丄丅丆万丌与丒专丗业丛东丝丠両丢丣两严丧丨丩个丬丯临丵丶丷为丼丽举丿乀乁乂亓乄乆乇义乊乌乐乑乔乕乗乚乛习乡乢乣乤乥书乧乨乪乫乬乭乮乯买乱乲乴乵乶乷乸乹乺乻乼乽乿亀亁亃亄亅亇争亊亏亐亖亗亘亚亜亝亠亣产亩亪亯亱亲亴亵亷亸亻亼亽亾亿仅仈仌从仏仐仑仒仓仚仛仜仝仠仢仦仧仩仪仫们仭仯仱仴仸仹仺仼仾伂伃伄伅伆伇伌伒伓伔伖众优会伛伜伝伞伟传伡伢伣伤伥伦伧伨伩伪伫伬伭伮伱伲伳伵伷伹伻伿佀佁佂佄佅佋佖佡佢佥佦佨佫佭佮佱佲侀侅侌侎侒侓侕侙侞侟侠価侢侣侤侥侦侧侨侩侪侫侬侭侰侱侲侳侴侸侺侻侼侽侾俀俆俇俈俉俋俌俒俓俕俖俙俢俣俤俥俦俧俨俩俪俫俬俭俰俲俷俻俼俽俿倁倂倄倇倊倎倐倛値倧倯倰倱倲倳倴倵倶倷倸倹债倻倽倾倿偀偂偄偅偆偊偋偍偐偑偒偔偖偗偘偙偛偝偞偠偡偣偤偦偧偨偩偫偬偮偱偳偸偹偻偼偾偿傁傂傄傆傇傉傊傋傌傏傐傓傗傛傝傟傠傡傤傥傦傧储傩傪傫傮傰傱傶傸傹傼傽傿僀僁僃僆僈僊僋僌働僐僒僓僖僗僘僙僛僞僟僠僡僢僣僫僲僴僶僷僸僺僼僾儁儅儍儏儎儑儖儙儚儛儝儞儠儢儣儥儧儨儫儬儮儯儰儵儽儾兂兎兏児兑兓兖兘兙党兛兝兞兟兠兡兣兤兯兰兲关兴兺养兽兾兿冁冂冃冄内円冇冈冋册冎冐冑冖写冚军农冝冟冡冣冦冧冨冩冫冭冮冯冲决冴况冸冹冺冻冼冾冿净凁凂凃凄凅凇凈凉凎减凐凑凒凓凕凖凗凘凙凚凛凞凟凢凣凨凩凪凫凬凭凮凯凲凴凵击凼凾凿刂刄刅刉刋刍刏刐刔刕刘则刚创刞刟删刡刢刣刦刧别刬刭刯刱刴刹刼刽刾刿剀剂剅剆剈剏剐剑剓剘剙剠剢剣剤剥剦剧剨剫剬剭剰剱剳剶剹剻剼剾劀劅劆劋劎劏劒劔劕劗劚劜劝办务劢劤劥劧动劮劯劰劶劷劸劺劽勀勂勆勊勎勏勓勜勡勥勨勪勫勬勭勮勴勶勼勽匁匂匇匌匎匒匓励劲劳労劵効势勄勅勈勋勌勐勑勔勚勠勧勯勲勹匀匃匄匉匑匛匢匤匥匨匩匫匬匰匷匼卙卥卭卶匔匚匞匦匧匮匲匵匶匸区医卄卆卋华协卐单卖単卛卝卟卢卤卧卨卩卪卫卲却卾厁厃厇厈厊厏厑厒厛厡厧厫厬厯厱厵厸厼厽叀叏叐叓卺卽厀厂厅历压厌厍厎厐厕厗厙厠厢厣厤厦厨厩厪厮厰厳ㄙ厷厺厾县叄叅叆収发变叙叚叜叝叞叴叺叾叿吀吂吇吘吙吢吤吷吺吿叠号叹叻叽吅吓吕吖吗吚吜吣吥吨启呒呓呕呖呗员呙呛呜咏咛咝呄呅呍呚呞呟呥呩呭呮呹呾咃咉咓咜咞咟呁呇呉呋呌呏呐呑呠呡呣呧呪呬呯咁咅咊咑咠咣咰咵咶哅哊哖哘哛哠哣哬哯哴哵哷哸哹哻哾唀咤咴哌咲咹哋响哑唋唌唍唒唓唖唗唙唜唟唥唦唨唩唭唴唺唽啂啇啈啋啌啒啔啘啙啚啛啝啠啨啩唛唝唠唡唢唤啧唊唎唘唞唣唹唻唿啉啢啫嗗嗘嗠嗢嗧嗭嗮嗱嗴嗸嗺嗼嘃嘄嘇嘋嘕嘙嘝嘨嘪嘳嗫嗳嘘嘤嘱嗕嘺嘼嘾噃噄噆噈噊噋噐噑噒噕噖噟噡噣噧噮噰噵噺噽噾噿嚁嚂嚈嚊嚋嚍嚑嚒嚖噜嘷噅噉噛噳噼嚉嚔嚘嚛嚠嚡嚢嚤嚧嚩嚪嚫嚰嚸嚹嚺嚻嚽嚾嚿囃囄囇囋囎囏囐囕囜囩嚣团园囱围囵嚙嚝嚞嚟嚯囆囍囒囓囖囗囘囙団囥囦囨囬囯囲図囶囸囻囼圁圎圑圚圝圠圡圤圥圦圲圵圶圷圸圼圽圿坁坃坄坅坉坔坖坘坙国图圆圣圹场块坚坛坜坝坞坟圀圅圏圐圙圢圧圪圫圱圴坆坈坋坒坓坕坢坣坥坧坬坮坶坸坹坺坾垀垁垉垊垐垑垘垥垨垪垬垰垳垶垷垸垹垻垼垽埁坠垄垅垆垒垦垩垫垭垱垲垴坭坲坴坽坿垇垈垎垏垕垖垙垜垟垧垯垵垾垿埀埅埉埊埍埐埑埓埖埞埢埣埥埨埩埪埬埮埱埻埾埿堁堏堒堓堔堗堚堛堜堟堢堣堥埘埙埚埯堑堕埽堃堈堌堎堖堘堦埄埇埈埗埛埡埦埫埰埲堩堫堬堶堷堸堹堺堻堾塀塇塉塎塐塖塛塜塣塦塧塨塪塮塯塰塳塴塶塷塸塺塻墂墄墆墇墋堨堭堳堼堿塁塂塃塄塅塆塈塙塝塟塠塡塤塥塩塬塱塲墈墌墍墎墏墑墔墕墚墛墡墢墣墤墥墧墭墯墱墲墴墷墸墹墽墿壀壂壃壉壍壏壐壗壛壣壥壦壧壨壭墙壮墖増墪墫墬墰墵墶墻壄壆壊壋壌壒壔壖壜壡壪壵壷壾夁夃夈夋夎夐夑夒夛夝夞夡夰夲夳夵夻夽夿奀奃奅奆奊奍奒声壳壶壸处备复够头夸夹夺奁奂奋壱売壻壿夀夅夆変夌夓夗夘夣夬夶夼奌奙奛奝奞奟奤奦奯奱奲奵奷奺奻奾奿妀妋妌妎妐妑妔妕妛妜妟妠妡妢妦妧妰妱妴妶奖奥妆妇妈妩妪妫奜奣奨奫奬妅妉妏妘妚妬妭妵妷妼妿姀姂姃姇姌姎姏姕姖姛姟姠姡姢姩姭姯姰姲姳姴姷姼姾娊娋娍娎娏娐娔娕娖娗娙姗姹娄娅娆娇娈妽姄姅姈姉姙姧姫姵姶姸娂娒娚娝娞娡娢娤娦娧娨娪娫娬娮娰娳娷娹娺娻娽娾婂婃婄婅婇婈婋婌婍婎婏婑婒婓婔婖婗婘婛婜婝婟婠婡婩婫婯婰婱婲婸婻婾娱娲娴婳婴婵婶娯娵娿婙婣婤婨婮婹婽媀媂媃媆媇媈媉媋媌媎媐媑媓媔媗媘媙媜媝媡媣媤媥媦媨媫媱媴媶媷媹嫀嫃嫅嫆嫇嫊嫍嫎嫓嫛嫝嫞嫟嫢媁媄媅媊媏媩媪媭媰媿嫐嫑嫒嫔嫙嫬嫰嫱嫺嬀嬅嬔嬢嬦嬫嬷嬹孄嫮孈孉孊孋孍孎孒孞孠孡孧孮孯孲孴孷孹孾宆宎宐宑宒宔宖孙学孪宁宝实宠审宪宫孏孨孭孶孻孼宀宂宍実宨宩宭宯宱宲宷宺宻寈寉寊寋寍寏寚寜寣寯寱寲寴寷寽尀宽宾寝对寻导寿将宼寃寑寕寗寙寛寠寳対専尅尛尞尡尣尦尫尮尯尳尵屒屔屗屚屟屰屲屳尔尘尝尧尸层屉届属屡尒尓尕尗尙尜尠尢尩尭尲尴尶屃屇屓屖屛屦屪屫屮屵屶屷屸屻屽岃岄岆岇岉岋岎岏岓岕岟岠岤岥岦岪岮岯岰岲岴岶岺岻岼岾峅峆峈峉峊峌峍峎峏峐峑峔峕峖峗屿岁岂岗岛岭岳岿屾岀岅岊岍岖岘岙岚岜岞岨岹岽峀峁峂峃峄峇峓峘峛峜峟峠峢峫峬峮峲峳峵峷峸峺峼峾崅崈崉崊崕崜崝崡崣崥崨崪崫崰崲崵崷崸崹崺崻峡峦崭峝峞峣峤峥峧峩峹崀崂崃崄崋崌崏崐崓崘崠崬崯崳崶崼嵀嵁嵃嵅嵆嵈嵉嵍嵏嵑嵔嵕嵜嵟嵠嵢嵣嵤嵥嵦嵧嵨嵪嵭嵮嵰嵱嵲嵳嵵嵶嵷嵸嵹嵻嵽嵿嶀嶆嶈嶉嶊嶍嶎嶏嶐嶑嶕嶘嶚嶛嶜嶖嶌嶋嶅嶃嵼嵺嵴嵡嵝嵛嵚嵙嵘嵗嵖嵓嵄崾嶣嶤嶥嶦嶩嶬嶯嶱嶳嶵嶶嶹嶻嶾嶿巀巁巄巈巊巎巏巐巑巕巙巪巬巭巶巸巺巼巩币嶨嶫嶭嶲巂巅巆巌巓巗巚巟巠巣巤巯巰巻帇帉帊帍帎帒帓帞帠帢帤帩帪帴帵帾帿幁幆幉幊幍幎幐幒幓幖幜幝幤幥幧帅师帐帘帜带帧帮幂帬帲幇帄帋帏帯帰帱帹帺帻帼幈幏幑幚幟幱庂庌庍庎庘庛庝庡庢庣庨庩庪庮庯庰庲庺廅廇并广庄庆庐库应庙庞废庿庅庻幷幯庁広庈庑庒庴庼庽廀廃廆廍廔廗廘廜廤廦廫廭廮廯廰廲廽弅弉弖弙弚弜弞弡弬开异弃张弥弯廏廐廴廵廸廹廻廼弌弍弎弐弑弪弫廪弲弴弻弽弿彁彂彃彅彇彉彋彍彏彚彜彣彮彯彵彶彺彾徆徍徎徏弹强归当录彝彦彻径従徃彐彑彛彠彡弳弾彟彨彲彽徔徖徚徛徝徟徢徣徤徥徦徫徰徱徲徶徸徺徾徿忁忇忈忊忋忓忔忚忟忥忦忨忩忯忰忳忴忶忷御忆忧忲徧徕徳徴徻忀忂忄忛応忬忹忼怇怈怉怋怌怐怑怘怟怢怣怤怬怮怰怴怶怷怺怽怾恀恄恅恈恊恎恑恖恗怀态怂怜总恋怱忾怃怄怅怆怞怸怼怿恏恘恛恒恜恦恮恱恲恴恷恾悂悇悈悋悎悏悓悗悘悙悡悥悹悺悿恳恶恼悦悬悯恠悞悤悪恞恡恵恸恹恺恻恽悀悆悊悐悑悜悧悩悫悭悮悳惀惁惂惃惉惍惐惖惗惞惢惣惤惵惼惽惾惿愂愄愅愇愋愌愖愗愘愝愞愡愢惊惧惨惩惫惭惮惯愠愙惪惈惒惥惬惷愃愑愥愩愪愰愱愲愳愵愶愸愹愺愻慀慃慏慐慒慓慔慖慗慛慞慠慡慦慩慯慲慸慹慺慻憁憄憅憆愤愿慑憇愼慙慽愦愭愽慂慜慤慪慭慿憈憉憌憏憓憕憗憘憛憜憞憟憠憡憢憣憥憦憰憱憳憴憵憻憼憽憿懀懁懄懎懏懓懕懖懗懘懙懚懛懜懝懡懢懧懩懪懒懔憭憷懐懑懬懭懯懳懴懹懻戂戃戅戓戙戜戨戫戵扄扅扏戏战户扎戞戱戼懱戆戋戗戝戠戦戬戯戸戺戻扌扖扙扚扜扝扟扥扨扲扴扵扷扸扺抁抂抅抇抋抍抎抐抙抣抧抩抪抭抮抯抰抲抳扑扦执扩扫扬扰抚抠抡抢护报抛抝払扗扡扪扻扽抈抜択抟抦抷抸抺抾拀拁拞拰拲拵拸拹拺拻挀挃挄挅挆挋挏挒挕挗担拟拢拣拥拦拧拨择拃拕拝拠拡拤拪挊挍挔挘挧挩挬挭挮挰挳挴挷挸挻捀捁捇捈捊捑捒捔捖捚捛捝捠捤捦捪捬捰捳捴捵捸捹挚挛挝挞挟挠挡挣挤挥捞损捡换捣挱挙挜挢挦挵挿捓捗捙捜捥捾捿掁掋掑掓掕掚掜掝掭掵掶掹掻掿揁揂揇揈揊揋揔揙揟掳掷掸掺揅揑捼掍掟掲掴掼掽揌揓揗揘揢揤揧揨揬揯揱揼搃搄搈搑搙搚搝搟搩搫搮搱搸搹搻搼揽搀搁搂搅携揷揸揦揰揺揻揾揿搇搒搣搲摂摉摋摌摍摐摕摖摗摚摝摡摢摣摤摥摨摪摫摬摱摵摼摾撀撁撉撌撍撎撔撗撘撛撜撠摄摆摇摈摊撑撆摅摏摙摞摮摷摿撃撄撊撡撨撪撯撴撶撹擃擆擈擌擏擑擛擜擝擟擪擮擳擵擶擹攁攅攇攊撵擞擕擧攂攈撱撷撸撺擓擖擥擸擼擽攃攋攌攍攎攑攕攗攚攞攠攡攦攨攭攱攳敀敄敆敊敋敐敒敟敠敡敤敥敨敩敮敯攒敌敛攟攴攵敍敎敓攐攓攰敂敃敇敚敭敶敼敾斀斅斆斊斍斏斖斘斣斦斪斱斳斴斶斺斻旇旈旉旍旑数斋斩断旊斈斉斚斵斾敱敽敿斎斓斔斞斢旀旔旕旘旙旚旜旞旫旲旳旿昁昅昈昋昍昐昖昗昘昛昢昩昮昲昷无时旷昰昬旣旤旹旾昚昞旪旵旸旽昑昙昣昤昦昪昸昹昿晀晆晇晈晊晍晎晐晘晠晣晧晭晱晲晵晸晹晼晽暀暃暅暊暏暓暙暚暛昼显晋晒晓晕暂晳暎昻昽晄晑晔晖晗晥晩晪晫晿暁暆暒暔暕暟暣暤暥暩暬暭暯暰暳暷暺暼暽暿曁曂曃曅曊曋曍曎曔曕曗曞曟曢曣曤曥曧曪曫曭曮曯曵曶曺曌曡曬暜暞暦暧暪暲暶暸暻曐曑曒曓曘曱曻朄朇朌朎朑朒朖朚朜朡朤朥朰朲朷朸朹朻朼杁杄杊杋杍杒杔杘杚杛杢杣札术朴机杀杂权条朙朞朶朆朊朐朠朢杝杤杦杫杬杮杹杺枀枂枃枅枆枈枍枎枑枔枖枠枡枤枦枩枬枮枺枼枽枾枿柀柆柇来杨杰极构枢枣枪枫枏枟枱杩杸杽枙枞枥枧枨枭柂柃栬栮栯栶栺栿桇桊桍桏桖桗桘桙桛桝桞桪桬桰桱桳桵桸桻桼桽桾梀梂梄梇梈梉梋梌梎样档桥桨桩栾桺栰桒桕桜桟桠桡桢桤桦桧桭梊梍梑梒梕梖梙梚梛梞梤梪梫梬梮梶梷梺梻梽棅棆棇棈棌棎棏棓棔棙棛棝棞棡棢棥棦棭梦检梹棃棊棑梘梥梱梴梸梼梾梿棁棂棤棩棪棯棳棴棷棽棾棿椂椃椇椔椕椖椘椙椚椛椞椡椢椣椦椧椨椩椬椯椱椲椺椻椼楁楃楆楇楈楉楌楏楐楑楒楕楖椭椀椶椁椆椉椊椋検椝椟椠椤椥椫椮椴椵椾楀楋楍楜楡楤楧楱楲楴楶楺楾楿榁榋榌榍榏榐榑榒榓榗榙榚榝榞榟榢榣榩榬榯榳榵榶榸榹榺楼楳楘楟楻楽榀榃榄榅榇榈榉榊榎榠榡榥榪榲榽槂槄槅槆槇槈槉槏槒槗槙槝槞槡槣槦槫槬槯槰槴槶槷槸樀樃樄樇樈樉樋樌樍樒樔樖樚樜樝槛槀槑槕槖槩槪槹槼様槚槜槟槠槢槵槺槾樆樎樏樘樢樤樥樦樫樬樭樮樰樳樷樼橀橂橅橉橌橍橏橑橒橓橔橖橗橝橞橠橣橦橨橩橪橬橭橮橯橰橲橳橴橵橶橷橸橺橻橽檂横樱橱橜樧権樯樶樻橁橃橆橊橎橥橹橼橾檅檆檈檋檌檏檒檓檕檘檙檚檛檞檡檤檦檧檭檰檱檲檶檷檹檺檼檽檾檿櫀櫁櫄櫅櫇櫉櫊櫋櫍櫎櫏櫐櫑櫒櫔櫕櫖櫗櫘櫙櫢櫣櫤櫦檝檊檨檩檪檫檴檵櫠櫡櫩櫭櫮櫯櫰櫲櫴櫵櫶櫷櫼櫾櫿欁欅欆欇欈欉欋欌欍欓欔欕欗欘欚欜欟欥欦欩欪欫欭欮欯欰欳欴歀歂歄歅歋欢欧欝欤欵櫹櫽欀欎欱欼歁歍歏歑歒歖歚歝歞歬歭歱歵歶歽殅殌殎殏殐殔殕殝殟殦殧殩殬歼残歗歘歛歫歾殡歨歩歮歯歰歳歴殁殇殒殓殚殨殱殶殾毃毄毇毊毜毝毞毟毠毢毣毤毥毦毨毩毭毮毰毱毲毶毸毺毻毼氀氁氃氋氎殴毁毕毙毡氄殸殻毂毎毑毪毴毵氇氞氭氱氶氻汃汄汌汑汒汓汖汘汢汣汥汦汬汮汯汱汵气氢汇汉汤氷気氜氝氩氲氵氹氺氼氽汅汈汫汳汷汸汻汼汿沀沊沋沎沑沗沜沝沞沠沯沲沵沶泀泋泍泎泏泘汹沟没沤沥沦沧沪沢沣沨沩沰沺泃泇泈泑泒泟泤泦泧泬泴泶泹泿洀洂洃洅洆洈洉洍洐洓洔洕洖洘洜洝洠洡洤洦洬洯洰洷泞泪泻泼泽洁洒泩泷泸泺泾洇洢洣浀浂浌浖浗浘浛浝浟浢浧浨浫浱浳浵浶浺浻浾浿涀涁涃涆涋涍涏涗涚涜浅浆浇浊测济浑浓涂涌涛涝涟涡涣浄涖浃浈浉浍浏浐浒浔浕浤浭浰浲浽涄涐涙涞涠涢涥涭涰涱涳涹涺涻涽涾淁淃淈淉淍淎淐淔淕淗淣淧淭淲淴淽淾淿渀渁渂渃渄渆涤润涧涨涩淀淂涬涶淊淏淓淛渇渏渒渘渜渞渪渱渳渵渷渹渻渽渿湀湁湂湆湇湈湏湐湒湕湗湙湚湠湡湤湥湦湨湪渊渍渐渔渗温湌済渉渋渌渎渑渓渕渖渧渮渶湋湬湭湰湵湶湷湸湹湺湽溂溄溊溋溌溑溒溓溔溕溗溙溚溞溡溣溨溩溬溭溰溸溹溿滀滆滈湾湿溃溅湻湼湳湴満溁溆溇溍溎溛溤溮溳溵溻溾滊滍滐滒滖滜滣滭滰滱滳滵滶滺滼滽漀漃漅漇漋漌漍漐漑漒漗漛漝漞漟漧漮滚滞满滤滥滦滨滩滗滘滛滝滟滠滢滧滪滹漄漎漖漜漡漤漥漨漴漺漻漽潂潅潈潉潊潌潐潒潓潖潙潡潣潥潧潨潩潪潫潬潱潳潶潹潻澅澊澋澏澑澓澕澖潍潜漹潃潄潆潇潋潕潗潴潵潷潽潿澁澃澘澚澝澞澢澩澪澭澯澲澵澷澸澺澻澾澿濄濅濌濎濏濐濓濖濗濙濝濢濣濥濦濧濨濪濭濳濴濵濷濸濹濻澜濒濶澙澛澟澫澬澰澽濉濋濍濑濚濲濽瀀瀃瀄瀇瀈瀊瀎瀐瀓瀖瀗瀙瀜瀢瀤瀥瀩瀪瀫瀭瀮瀯瀴瀶瀷瀸瀻瀽瀿灀灁灂灅灆灇灊灍灎灐灓灔灗灙灚灛灜灟灒灏灋灈瀱瀬瀞瀔瀒瀂濿灡灦灧灱灲灳灷灹灻炂炃炄炇炈炋炍炐炑炓炚炛炞炠炡炢炥炦炧炨炩炪炵炶炿灭灯灵灶灾灿炉点炼炽烁烂烃烀炾炻炴炲炣炟炝炜炗炖炏炌炆炁炀灴灮灬灪灨灥灢灠烄烅烆烇烌烍烎烐烑烒烚烞烠烡烢烣烥烪烮烰烲烵烸烻烼烾烿焀焁焂焅焇焋焍焎焏焑焒焛焝焣焤焥焧烛烟烦烧烩烫烬热焕焢焟焘焖焔焓焈焆焃烶烳烱烨烗烖烓烉焨焩焪焫焬焭焲焳焵焷焸焹焺焻焽焾煀煂煄煈煔煘煛煡煣煪煫煭煯煱煵煶煷煹煼煾煿熂熃熆熋熉熈熁熀煺煸煴煳煰煟煝煚煖煕煓煑煐煍煋煊煅煃焼焴熌熍熎熐熑熓熕熖熚熝熞熡熢熣熦熧熩熪熫熭熮熶熷熺熻熼熽燅燆燌燍燑燓燘燛燝燞燢燣燤燩燪燫燯燨燚燗燏燇熿熴熥熤熜熘燱燲燳燵燷燸燺爀爁爂爃爄爅爈爉爋爎爏爑爒爖爘爙爜爞爠爡爢爣爦爧爩爮爳爴爼牃牅牉牊牑爱牐牎牍爲爯爫爥爤爗爕爔爌燽燶燰牔牗牜牞牥牨牪牫牬牭牰牱牶犃犅犈犌犐犑犓犔犕犘犙犚犜犝犞犡犣犤犥犦犱犲犳牵牺犊状犷犭犫犪犩犠犟犏犇犂牳牦牤牕犻犼犽犾犿狅狇狊狋狌狏狑狔狕狖狚狛狜狟狢狣狤狧狪狵狶狾狿猀猄猅猆猉猌猍猏猐猑猒猔猚犹狈狞独狭狮狰狱猎猕猈猃猂狲狯狦狥狝狘狓狍狆犸猠猤猦猧猯猰猼猽獂獆獇獈獊獌獑獓獔獖獛獟獡獤獥獦獩獶獹獽獿猪猫献獭獴獳獱獧獣獢獞獜獚獙獘獋獁獀猹猸猭猬猨猣猡猟玌玏玐玚玜玝玣玧玪玬玴玵玸玽玾珁珄珆珕珗珘珜珟珢玛环现珐珑珡珝珛珚珖珔珒珏珎珋珇珃玿玺玹玶玱玮玡玞玙玘玔玒玑玊玆玅玂珤珨珫珬珯珱珴珸珼珿琂琄琋琌琑琒琓琔琕琗琘琙琜琞琟琡琣琧琩琷琸琻琽琾瑅瑆琐琼瑇瑃瑂琹琠琝琏琎琍琈琁珻珺珹珷珶珳珲珰珦瑈瑊瑌瑍瑎瑐瑒瑓瑖瑘瑝瑡瑥瑦瑫瑬瑮瑴瑵瑸瑹瑺瑼璂璄璌璍璏璑璒璓璔璕璖璗璙璛璤瑶璥璢璡璝璎瑻瑷瑨瑧瑠瑔瑏瑉璭璳璴璶璷璹璻璼璾瓂瓃瓄瓆瓇瓉瓋瓍瓎瓐瓑瓓瓕瓗瓙瓝瓟瓡瓥瓧瓨瓪瓫瓭瓲瓳瓹瓺瓽瓾甂甅甆甈甉甊甇甁甀瓼瓸瓵瓱瓰瓯瓩瓒瓌瓈瓁璸璯璮璬倗兦兪双叧吲吴兊凷匘咗咘咙圔圕圗夦夨宊寪寭尐尽忎忏忢忣怓掅掦攺攼攽旧曽朁朂朩枛歺氒淸爷甐甠甤甧甶甼畃畉畍畐畓畕畖畗畘畞畠畡畣畨畩畭电画畅畳畲畱畮畧畒畑畊畈畆畄畂畁甴甮産甞甝甛甙畻畼疀疁疂疄疅疈疌疓疛疜疞疦疨疩疪疰疷疺疻痀痃痆痋痑痓畴疗疟疡疮疯痈痉痒痖痐疿疶疴疭疬疠疘疖疕疒疎疍疉畾畺畵痝痟痥痬痮痶痷痸痽瘄瘇瘎瘑瘒瘔瘣瘬瘱瘶瘷瘹痪瘪瘫瘺瘮瘜瘛瘚瘘瘗瘆瘅瘂痵痭痫痩痨痜痚瘽癁癊癋癏癑癓癗癚癛癝癦癨癳癴癵癷癹皅皉皊皍皏皔皗皛皟癣皋皑皝皘皒皐皌皃癿発癶癯癫癪癧癡癞癕癐癎癍癅癄癀瘿瘾皠皡皢皣皥皧皩皬皯皳皵皶皹皼皾盀盁盄盓盕盙盠盢盨盫盰盳盶盷盺盽盿眀眃皱盏盐监盖盗盘眂盵盚盌盋盇皷皲皨眆眏眐眒眓眔眖眗眘眜眝眤眧眪眫眮眱眲眻眿睈睉睋睌睔睕睗睝睤睧着睁睙睘睖睓睑睐睂眳眰眬眦眣眡眞眑眎眍県眅睩睭睮睰睱睲睳睴睵睶睷睸睻睼瞁瞂瞃瞆瞉瞊瞐瞔瞗瞙瞚瞛瞝瞡瞣瞦瞨瞮瞯瞱瞲瞴瞶瞸瞺瞾矀矂矃矄矅矆矈矊矋瞒瞩矁瞹瞜瞕瞓瞈睯矌矎矏矐矑矒矕矖矘矝矡矤矪矲矵矹矺砇砊砋砎砏砐砓砙砛砞砡砤砨砪矫矾矿码砖砚砯砬砩砜砘砗砕砅砄砃砀矷矶矴矨矦矠矟矙砱砶砽砿硂硄硆硈硉硊硋硓硔硘硛硞硟硠硡硢硣硥硦硧硩硰硱硲硳硴硶硸硹硺硽硿碀碂碄碅碆碊碋碐碒砾础硅硕确硷碍碈碃碁硾硻硵硚硙硗硖硑硐硏硍硁砼砻砺砹砳碕碖碙碠碢碤碦碨碮碵碶碷碹碽碿磀磂磃磄磆磇磌磍磏磒磓磗磘磝磞磢磦磩磫磮磰磱磳磶碱磵磭磥磤磡磟磜磛磙磖碸碯碬碝碜碛磸磼磾磿礂礃礇礈礉礊礋礍礏礑礒礔礕礖礘礛礟礠礢礣礥礨礩礭礯礰礳礶礷礸礹礻祋祌祑祒祙礼祘祎祍祄祃礵礲礮礡礝礜礚礗礐礆礅礀磹祡祣祤祩祪祬祮祰祱祳祴祵祶祹祽祾禃禆禈禉禌禐禒禓禗禙禞禟禣禬禭禯禲禵禶禷禼祷祸禄离禸禩禥禤禢禠禝禑禇禅禂禀祻祯祦祢秂秄秅秇秎秐秓秗秙秛秝秞秡秢秥秨秪秮秱秲秳秴秵秶秹秺秼秿稁稄稇稏稐稒稓稕稖稘稝稡稢秃秆种积称秸秽税稣稉稆秾秷秜秚秔秌秊稤稥稦稧稩稪稫稯稰稴稵稶稸穁穃穐穒穓穔穕穖穘穙穚穛穝穥穦穪穬穱穲穳穻穼穾窇稳穷窃窂穽穵穯穭穨穤穣穞穑穏穇穅穂稾稺稲稭稬窉窏窐窙窚窛窡窢窤窧窫窱窲窷窹窼窽竀竂竆竉竌竍竎竏竐竒竓竔竕竗竘竛竤竧竨竩竫窍窑窜窝窥竖竞竪竢竡竝竜竚竈竃窻窴窰窭窦窓窎竬竮竰竱竲竳竴竵竷竸竻竼笁笂笅笇笌笍笒笖笗笘笚笜笝笟笡笢笣笧笩笴笶笷笹笽笿筁筂筄笋笔笺笼筎筃筀笾笻笰笫笪笤笕笓笐笎笉笃笀竾筓筗筙筟筡筣筨筪筫筬筶筺筻筽筿箁箃箄箆箈箉箌箖箚箞箟箣箤箥箰箲箳筑筛筹签简箩筕筚筜筝筞筼箓箢箦箧箨箪箫箬箛箒箊箂筸箵箶箷箹箺箻箼箽箿篂篅篈篊篍篎篏篐篒篕篗篞篣篫篬篵篸篺篻篽篿簂簄簅簈簊簎簐簓簔篓篮篱篃篑篖篭篯篶簖簗簕簒簁篴篧篢篟篜簘簙簚簛簢簤簩簭簯簱簲簳簴簵簶簺簼籂籄籆籇籈籉籋籎籏籕籗籘籞籡籦籨籰籱籶籷籺类籵籴籭籫籢籝籚籖籒籑籅籁簻簮簥簝籾籿粂粅粆粈粊粌粍粎粏粐粓粖粙粠粡粣粫粭粯粴粶粷粸糀糂糃糄糋糎糏糐糑糓糘糚糛粤粪粮糔糉糇糆糁粰粬粩粨粧粦粝粜粛粚粋粇粃粁粀籼糡糣糤糥糦糩糪糫糮糳糵糷糼糽糿紁紌紎紏紒紖紣紤紦紨紪紭紴紶紷紸紻紧紥糺糹糸糭絇絈絉絊絋絑絒絔絗絙絟絠絤絥絧絩絬絭絯絴絸絼絽絾綄綇綊綋綐綒綔綕綛綞綟綡綤綧綥続継綘綗綂絷絶絵絫絝絚絘絍経綨綩綶綼緀緂緃緈緉緓緕緟緢緧緭緮緳緵緷緸緺緼緽緾緿縀縅縆縇緫縁縂緥緔緖総緐緑緍綳綫緜縄緤縃緰緛緁縌縍縎縒縓縔縖縘縙縜縤縥縨縪縬縸縺縼繀繂繉繌繍繎繏繑繓繗繛繜繝繟繤繥繧繬繮縦縧繊繋繦縯縡縚繱繲繴繵繶繷繺繿纀纃纄纅纋纐纗纝纞纼纠红纤约级纪纫纬纯纱纲纳纵纶纷纸纹纺纽线练组绅细织终绊绍绎经绑绒结纎纒纟纡纣纥纨纩纭纮纰纴纻纾绀绁绂绉绋绌绐纙纉绬缍缐缷绕绘给绚络绝绞统绢绣绥绦继绩绪续绰绳维绵绷绸综绽绿缀缄缅缆缉缎缓缔缕编缘缚缝缠缨缩缮缴绔绖绗绛绠绡绤绨绫绮绯绱绲绶绹绺绻绾缁缂缃缇缈缊缋缌缏缑缒缗缙缛缜缞缟缡缢缣缤缥缦缧缪缫缬缭缯缰缱缲缳缵缹缻缼缿罀罊罖罙罜罞罤罧罬罯罺罼羄羉羏羐羒羓羕羘羙羛网罗罚罢罎罉羂羁羀罸罴罱罓罇罆罂罁羗羍羃罒羠羦羪羫羬羳羷羺羻羾翂翆翇翈翉翋翍翐翑翓翗翜翝翞翢翤翧翨翭翲翴翵翶翷翸羡翘翱翺翰翪翚翙翖翏翄羴羮羣羟耂耓耚耛耟耣耥耫耭耯耴耹耺耾聀聁聄聅聇聈聉聏聐聑聓聕聗聙聛聜聟聠聢聣耸耻聂聋职联聡耈耉耊耝耠耢耧耮耱耲耼聍聎耪耩聤聥聧聫聬聭聸聺聻肀肁肂肍肑肒肔肗肞肣肦肨肳肶肻胅聪肃肠肤肾肿胀胁胆聦聨聩聮肈聴聼肎肟肧肬肰肷肹肼肙肊胈胉胋胐胒胓胕胘胟胢胣胮胵胿脀脁脄脋脌脎脕脙脜脟脠脦脪胜胶脉脏脐脑脓脚胧胨胩胪胫胬脨胷脃脇脍脒脔脗脥胻胲胍脭脮脴脵脺脻脼脽腀腁腂腃腅腇腉腏腗腛腝腞腟腢腣腤腨腪腲腵腷膄膅膉膍膎脱脸腊腻腾脲脳脶脷脿腈腖腘腙腚腬腭腼腽膁膌腄膐膒膖膡膢膤膥膧膭膮膯膱膶膸膹膼臅臎臒臔臗臡臤臦臩臫臮臰臱膓膔臯膪臁臈臋臓臖臜臙臇膷膲膫膟膑膙臵臶臷臸臹舃舏舑舕舙舚舤舥舦舧舮舯舼舽舿艀艂艃艆艈艊艌艍艐艒艓艔舆舰舱臽舎舓舗舘舣舩舭舻舾艁艗艕艑舖艛艝艞艠艡艥艧艵艼芁芅芆芇芉芌芐芓芖芛芠芢芵芶芺艰艳艺节芜芦艢芲芪芕芗芈艻艶艪芰芤芞芘芀艿艹艸艷艬艩艣艜艚苀苂苃苅苆苐苖苚苝苢苨苬苭苮苰苳苵苸苼苽苿茋茐茒茙茟苇苍苏苹范茎茝芿苁苄苈苉苊苋苌苎苘苩苷茊茏茑茓茔茕茘茚茞茀苪苤苠茡茣茤茩茪茮茰茺茾茿荂荋荌荎荓荕荖荗荢荰荱荲荴荶荹荺荾荿莀莁莂莃茧荆荐荚荡荣荤荧荫药荮荭荬荪荩荨荦荥荠荟荞荝荜荛荙荘茽荁茦茥茢茠莄莇莈莋莌莍莏莐莑莗莟莡莣莤莥莬莮莯莵莶莻莾菄菈菋菍菒菗菙菚菛菞菤菦莱莲获莹莅莜莭莳莴莸莺莼菐菓菧菥菣菕菏菎菃莰莦莚菨菬菭菮菳菵菿萀萂萈萉萒萓萔萖萗萙萛萞萟萠萡萢萪萫萭萯萳萶萷萺萾萿葀葁葂葃葈葊葋萝萤营萧萨菷萅萕萘萚萜萦萮葇萻萣菾菺菪葌葏葐葓葔葕葘葜葝葞葟葢葨葪葮葰葲葻葼葾葿蒀蒁蒃蒅蒆蒈蒊蒍蒏蒑蒒蒕蒖蒘蒚蒛蒝蒠蒣蒤蒥蒧蒩蒫蒬蒮葱蒋葤蒭蒦蒓蒄蒇蒉蒌葙葠葥蒎蒰蒳蒵蒶蒷蒾蓃蓅蓈蓎蓕蓗蓘蓙蓚蓛蓜蓞蓢蓤蓨蓩蓭蓲蓳蓵蓶蓹蓻蓾蔁蔄蔅蔈蔍蔏蔐蔒蓝蓟蔋蔆蔃蓸蓪蓦蓥蓣蓡蓠蓔蓒蓇蒽蔖蔛蔜蔝蔠蔢蔤蔧蔨蔩蔪蔮蔰蔱蔲蔶蔿蕀蕂蕄蕅蕇蕌蕏蕛蕜蕟蕥蕦蕧蕫蕬蕯蕱蕵蔷蔼蕴蔳蔴蔵蔸蔹蔺蕋蕐蕒蕚蕰蕲蕳蕷蕶蕠蕗蕔蕍蔾蔙蔕蕼蕽薂薋薍薎薒薓薕薗薚薝薞薟薡薣薥薭薱薲薵薼藀藂藃藅藆藈藌藑藔藖藗藛蕿藓藊藁薻薫薬薮藘藒藄薾薽薸薳薧薘薉薃藞藡藢藣藧藫藬藮藯藰藱藲藵藸藽蘃蘈蘉蘌蘍蘎蘏蘒蘔蘕蘙蘛蘜蘟蘠蘡蘣蘥蘦蘨蘪蘫蘬蘮蘯蘰蘱蘲蘳蘴蘶蘷蘹蘽蘾藳藴藠蘂蘐蘓蘖蘝藼蘻蘵蘤藦虁虂虃虄虅虇虈虊虋虌虘虙虝虠虤虦虨虪虭虲虳虴虶蚅蚇蚎蚏蚐蚑蚒蚗蚙蚚蚞蚟蚠蚢虏虑虚虫虽虾蚀蚁蚂蚕虉虗虿蚃蚄蚉蚛虸虵蚈虬蚝蚘蚖蚔蚆虰虮虥虍蚥蚫蚭蚮蚷蚸蚼蚾蛂蛃蛈蛒蛖蛗蛝蛠蛢蛥蛦蛨蛪蛫蛬蛯蛶蛷蛼蛽蛿蜁蜄蛊蛮蛰蚦蛡蚬蛍蛎蛏蛕蛱蛲蛳蛴蛧蚲蜅蛵蛚蛘蛌蛅蚽蜌蜏蜔蜝蜟蜠蜤蜦蜧蜪蜫蜬蜭蜰蜲蜳蜵蜶蜸蜹蜼蝁蝂蝅蝆蝊蝔蝖蝚蝜蝞蝢蝧蝩蝪蝫蜕蜗蜡蝇蝉蝎蝄蝈蝋蜽蜯蜖蜐蝝蝑蝏蜨蜛蝬蝭蝵蝷蝹蝺蝿螁螆螇螊螌螏螐螑螔螕螖螛螜螝螤螦螧螩螪螰螱螲螴螶螷螸螹螼蟂蟃蟉蟌蟍蟏蝰蝱蝲蟇蟁蝼蝽蝾螀螥螨螠螡螙螋螎螮螚螒螉蟐蟔蟕蟖蟗蟘蟙蟚蟝蟞蟡蟤蟦蟧蟩蟫蟰蟱蟴蟵蟸蟼蟽蠀蠄蠇蠈蠌蠘蠝蠞蠠蠤蠥蠦蠪蠫蠬蠯蠳蟮蠎蠏蠒蠚蠧蠭蠮蠩蠗蠂蟨蟜蟓蠴蠺蠾蠿衃衏衐衑衜衠衦衧衪衯衱衳衴衶衸衻衼袀袃袇袉袊袌袏袐袑袓袔袕衅衔补衬袄衂衆衇衉衘衞衟衮衺袅袆衵衭衤衖蠽蠸袘袙袛袝袡袣袥袦袧袨袩袬袰袳袶袸袹袻袾裃裄裐裑裓裖裗裚裞裦裧裪裫裬裭裮裶裷裺裻袜袭装裤袠袴袵袮袯裵裩裥裣裠裢裆裇裈袿裍裌袲袚裿褁褃褄褅褆褈褋褍褑褖褗褜褝褞褠褣褤褨褩褬褮褷褹褺褼褿襀襂襅襈襊襎襐襑襒襓襔襗襘襙褀褏褛褴襃襇襍襕襋褉襣襧襨襩襰襱襳襵襷襸襹襺覀覄覍覑覒覕覙覛覝覞覟覠覢覣覨覫覭覮覱覴覵覶覸覹覻覼覾见观觃襥襽覇覉覊覌覎覐覔覚覥覧覩覰観覤覗覅觓觗觘觙觛觟觠觢觤觨觪觬觮觰觲觹觻訅訆訉訋訍訔訙訜訞訠訡訤訦规觅视览觉触觇觊觋觌觍觎觏觐觑觞觧觯觵觽訁訚觾觼觺訨訩訫訮訯訰訲訵訷訸訽訿詂詃詄詇詉詋詌詍詏詓詙詚詜詤詥詪詯詴詷詺詽詾誀誁誈誉誊訳詝詟詧詸詨詑詊誎誏誐誔誗誛誜誝誟誢誩誫誮誱誳誴誵誷誸誺誻誽諀諁諃諅諈諊諎諓諔諘諚諣諥諨諩諪諬諯説読誯諌諐諙誧諰諲諹諻諽諿謃謈謉謒謓謕謘謜謞謟謢謣謤謥謧謮謯謰謱謲謴謵謶謸謺謻謽謿譀譂譃譄譇譋譍譐譑譓謌謡謩謭譌譒譈譅謪謑謍謆譕譗譛譝譠譣譤譥譧譨譪譮譳譵譺譻譼譿讂讄讈讉讍讑讔讗讛讝计订讣认讥讨让讫训议讯记讲讳讶讠讦讧讪讬讱讴讵讷譞譡譢譩譱譲譶讁讃讇讏讐譹譭讻许讹论讼讽设访诀证评诅识诈诉诊诌词译试诗诚诛话诞诡询诣该详诧诫诬语误诱诲说诵请诸诺读诽课谁调谅谆谈谊谋谍谎谐谓谗谚诂诃诇诋诎诏诐诒诓诔诖诘诙诜诟诠诤诨诩诪诮诰诳诶诹诼诿谀谂谄谇谉谌谏谑谒谔谕谖谘谙谛谸谹谺谻谼谾豀豂豃豄豒豘豙豛豟豠豤豥豧豩豯豰豲豴豼豽豾豿谜谢谣谤谦谨谩谬谭谰谱谴谝谞谟谠谡谥谧谪谫谮谯谲谳谵谶豑豓豞豮豱豦豣豖豏豍豅貀貁貃貄貇貈貋貏貐貑貒貕貖貗貚貣貥貦貭貮貱貵貹貾賆賋賍賎賐賔賖賗賘賟貎貛貟賉賝賛賏賌貜賩賯賰賱賲賳賶賹賿贀贁贂贃贆贌贎贒贘贙贚贝贞负贡财责贤败账货质贩贪贫贬购贮贯贰贱贴贵贷贸费贺贼贾贿赁赂赃资贜贠贲贳贶贻贽赀赅赆赇賫賷贋贑贉賧賥赥赨赮赲赹赺赻赼赽赾赿趀趃趆趇趈趉趌趍趎趏趓趖趗趘趚趛趜趝趞趠趢趤趥趧趩趪赊赋赌赎赏赐赔赖赘赚赛赞赠赡赢赣赵赶趋赈赉赍赑赒赓赕赗赙赜赝赟赪赱趂趦趒趐赳趬趭趰趶趻趽跀跇跈跉跊跒跓跔跘跜跠跢跭跰跾跿踀踂踃踄踇踍踎跃践踊踌踋趱趸跄跞跥跶跷跸跹跻踁踈跙跍跁踑踓踕踗踙踚踛踨踭踲踳踷踸踻踾踿蹃蹆蹍蹖蹗蹘蹛蹞蹥蹨蹫蹱蹳踪踬踯踺蹏蹑蹒蹮蹰踼踜踒蹷蹸蹹躀躆躈躌躎躖躟躢躤躨躮躱躴躵躷躸躻躼躽躾躿軁軂軄軅軇軈軉軎軐軑軓軕軗蹿躯蹵蹽蹾躃躏躙躛躜躧躭躰躳躶躹軃軆躝躘軙軞軣軦軧軩軪軬軮軯軰軳軴軵輁輄輆輌輍輎輏輐輑輖輘輚輡輢輧輨輰輱輲輷輺軚転軤軭軲軽輙輫輭輵輤輋軶軡軠軝輽轁轃轈轊轋轌轐轓轚轛轠轣轥轪辝车轧轨轩转轮软轰轴轻载轿较辅辆辈辉辊辐辑输辕辖辗辙辞輼轜轫轭轱轲轳轵轶轷轸轹轺轼轾辀辁辂辄辇辋辌辍辎辏辒辔辘辚轞辡辥辧辪辬辴辷辸込迀迃迉迊迌迒迖迗迚迠迡迧迬迯迱迲迵迼迾辩辫边辽达迁过迈运还这进远违连迟迭适辠辢辤辳辺辻迏迩迳迹迶迣辿辶逇逎逘逜逤逧逨逪逫逬逰逳逷逽遀遃遆遈遌遖遚遤遦遧选逊递逻遗遥逈逥逦逩逹逺遅遟遡逓遉遪遬遱遳遾邌邍邒邔邖邚邜邞邟邤邥邩邫邭邼郀郂郆郉郋邓邮邹邻邝邨邬邷邺郄邎邉邆遰遫郌郍郒郖郘郣郥郩郬郮郱郶郺郻郼鄁鄃鄊鄌鄓鄛鄝鄟鄡鄥鄨鄪郑郧郸郏郐郓郞郦郷鄕鄋鄈鄅郹鄳鄸鄼鄽酀酁酄酑酓酘酙酛酜酟酠酨酫酭酳酻酼醀醈醎醏酝酱酿鄷酂酔酞酦酧酰酽酾醌醄醂酕鄿鄻鄵醔醗醘醙醠醥醦醧醩醶醷醿釄釒釖釚釛釞釟釠釥釨釫釮釯釰釲釴釶释醕醖醤醸醻釈釡釳釬釪醝釻釼釽釾釿鈂鈅鈊鈋鈏鈓鈖鈗鈘鈙鈚鈛鈜鈝鈟鈠鈡鈢鈨鈩鈪鈫鈭鈯鈱鈲鈵鈶鈻鈼鉁鉂鉃鉇鉎鉐鉒鉓鉔鉖鉘鉙釺鈈鈎鈬鉄鉕鉌鉊鉆鈤鈌鈄釸鉜鉟鉡鉣鉩鉪鉫鉮鉯鉰鉵鉷鉹鉽銁銂銄銆銇銈銉銊銋銌銏銐銒銔銗銙銝銟銡銢銯銴銸銺銽銿鉴鉝鉢鉨鉱鉳銞銭銮銰銱銹銾銵銤銕鉾鋀鋄鋉鋋鋎鋓鋔鋖鋗鋚鋛鋜鋞鋠鋢鋧鋫鋬鋲鋴鋵鋶鋷鋽鋾鋿錂錃錅錉錊錋錌錎錑錓錖錗錜錝錣鋣鋥鋭鋳錇錔錍錈錀鋻鋺鋯鋡鋘鋕鋑鋍鋊鋆錥錧錪錭錰錱錷錹錺錻錽錿鍂鍄鍌鍎鍑鍒鍓鍕鍖鍗鍙鍜鍝鍞鍟鍡鍢鍣鍦鍧鍨鍮鍯鍲鍷鍸鍻鍽鍿鎀鎁鎃鎅鎆錬録錾鍀鍁鍃鍅鍈鍩鍫鍳鍴鎄鎇鍹鍱鍐鍏錵錴錤鎈鎎鎐鎑鎕鎙鎜鎟鎠鎥鎨鎫鎱鎷鎹鎺鎼鎽鎾鏀鏂鏄鏅鏆鏉鏋鏍鏎鏏鏒鏓鏔鏕鏙鏛鏣鏥鏧鏩鏪鏫鎋鎓鎭鎶鎸鎻鎿鏁鏠鎲鎯鎤鎣鎒鎍鎌鎉鏬鏭鏮鏯鏱鏲鏳鏴鏶鏺鏼鏿鐀鐁鐂鐅鐆鐈鐉鐊鐋鐌鐍鐎鐑鐕鐖鐚鐛鐜鐞鐟鐢鐣鐤鐥鐪鐬鐯鐰鐴鐷鐹鐼鑁鑂鑃鑆鑇鑈鑉鑋鑍鑎鑏鏰鐄鐗鐝鐡鐦鐧鐾鑅鐽鐱鐩鏾鏻鏸鑓鑖鑗鑘鑙鑜鑝鑟鑡鑦鑧鑨鑩鑬鑮鑸鑺鑻钀钄钅针钉钎钒钓钙钝钞钟钠钡钢钥钦钧钨钩钮钱钳钆钇钊钋钌钍钏钐钑钔钕钖钗钘钚钛钜钣钤钪钫钬钭钯钰钲鑚鑛鑔鑹鑥鑐鑒鑕鑞鑠鑢鑣鑤鑪鑫鑭鑯鑱鑲鑳鑴鑵鑶鑷鑾钁钂钃鑶鑴鑳鑤鑐铴锍钵钻钾铀铁铂铃铅铆铜铝铡铣铬铭铰铱铲银铸铺链销锁锄锅锈锋锌锐锑锗钴钶钷钸钹钺钼钽钿铄铇铈铉铊铋铌铍铎铏铐铑铒铓铔铕铖铗铘铙铚铛铞铟铠铢铤铥铦铧铨铩铪铫铮铯铳铵铷铹铻铼铽铿锂锃锆锇锉锊锎锏锒锓锔锕锖镙镹镺错锚锡锣锤锥锦锨锭键锯锰锹锻镀镁镇镊镍镐镑镜镣镭镰镶锘锛锜锝锞锟锠锢锧锩锪锫锬锱锲锳锴锵锶锷锸锺锼锽锾锿镂镃镄镅镆镈镉镋镌镎镏镒镓镔镕镖镗镘镚镛镝镞镟镠镡镢镤镥镦镧镨镩镪镫镬镮镯镱镲镳镴镵镻镸镼镽镾閁閄閅閊閍閐閕閖閚閜閝閞閠閪閮閯閰閴閵閷閸闀闂闄闅闎闏闙闛闝长閇閗閙関閦閧閲閳闁闗闘閺闣闦闧阝阠阣阥阦阧阩阫阭阷阸阺阾陃门闪闭问闯闰闲间闷闸闹闺闻闽阀阁阂阅阉阎阐阑阔队阳阴阵阶闩闫闬闱闳闵闶闼闾闿阃阄阆阇阈阊阋阌阍阏阒阓阕阖阗阘阙阚阛陁阹陊陒陓陙陚陠陦陫陭陮陯陱陹隀隁隇隌隑隓隚隝隡隢隥隦际陆陇陈陕陨险随隐陉陖陗陥陧険陻陿隂隖隟隠隣陎陏陑隞隒隫隬隭隯隲隵隺隿雃雐雓雔雡雤雥雦雧雫雬雭雮雴雵雸雺雼雽雿霃霋隶难雏雾隷隽雑雠雳霁霊隹雂雗雚雟霌霐霔霕霗霘霚霟霠霥霦霬霯霱霳霴霵霶霷霻霼霿靀靃靅靇靊靋靌靍靎靏靕靗靘靟靤靧靫靯静霒霛霡霨霩霫霭霮霺靆靐靑靓靔靝靣靥靬靭靁靵靹靻靽靾鞂鞆鞈鞊鞎鞐鞓鞔鞕鞖鞛鞜鞟鞢鞤鞩鞪鞰鞱鞳鞷鞸鞺鞻鞼鞿韄韇韊韏韐韑韒靱鞇鞉鞌鞑鞒鞧鞯鞲鞴鞵鞽鞾韀韂韈靰靲鞁鞝鞡韕韗韚韟韠韢韥韯韰韲韴韷韸韼韽韾頉頋頕頙頛頝頢頣頥頧頨頩頪頮頱頵頶韦韧韩韵韛韤韨韪韫韬韮頔頚頟頬頳頴韖韱韹韺頀頺頾頿顀顁顂顃顄顅顈顉顊顐顖顝顟顠顡顤顨顩顪顭顮顲颒页顶顷项顺须顽顾顿颁颂预颅领颇颈颊颐频颓颖颗题頼頽顇顋顔顕顚顦顬顸顼颀颃颉颋颌颍颎颏颔颕颙颚颛颩颪颫颬颰颲颴颵颷颹飁飅飇飉飊飋飍飝飦飳飵飷飸飹飺飻颜额颠颤颧风飘飞颞颟颡颢颣颥颦飃飈飏飐飑飒飓飔飕飖飗飙飚飜飡飤飨飬飮飰飱飿颽飌飠颾餆餏餙餝餢餣餥餦餭餰餴饀饂饆饏饓饖饚饛饠饡餁餄餋餍餎餜餠餶餷餸餹餻饄饝饣饍饢餀餇餯饇饻馚馛馜馞馟馠馢馤馦馧馩馪馫馰馶馷馸馺馻馼馽馾駀駂駇饥饭饮饯饰饱饲饵饶饺饼饿馁馅馆馈馋馏馒饤饦饧饨饩饪饫饬饳饴饷饸饹饽饾馀馂馃馄馇馉馊馌馍馎馐馑馓馔馕馿駄駅駆馣駊駌駍駎駏駖駚駣駤駥駦駧駨駩駫駲駳駶駷駺駼騀騈騊騔騚騛騜騝騞騟騡騥騦騨騩騪駈駞駠駡駯駵騌騐騒験騗騘駗駋駽騆騇騢騬騯騱騲騳騴騹騻騼騽騿驇驉驋驐驑驓驜驝驞驠驡驣驧驨马驭驮驯驰驱驳驴驶驹驻驼驾骂骄骆骇骋验骏驲驵驷驸驺驽驿骀骁骃骅骈骉骊骍骎驘驆驙驫骩骪骬骮骲骳骵骻骿髃髉髊髗髚髛髜髤髬髰髱骑骗骚骡骤骐骒骓骔骕骖骘骙骛骜骝骞骟骠骢骣骥骦骧骶骺骽髅髈髋髌髎髙髝髞髠髢髥髨髩髪骱髄髇髍髵髶髷髸髼髿鬂鬇鬊鬌鬔鬕鬛鬜鬝鬞鬡鬤鬳鬶鬸鬹鬺鬽鬾鬿魐魒魓魕魗鬀鬉鬏鬓鬦鬪鬬鬭鬰鬴魀魇魉髺鬁鬎鬗鬠魌魖魙魜魝魞魡魤魥魧魩魪魫魮魰魱魲魳魶魹魻魼魽魿鮂鮅鮇鮉鮏鮔鮕鮖鮗鮘鮙鮛鮝鮢鮤鮥鮧鮩鮬鮯鮰鮱鮲鮳鮴鮵鮷鮹魢魣魭魸鮁鮃鮄鮊鮋鮌鮍鮎鮜鮟鮣鮺鮻魛魵魺魾鮈鮶鮼鮽鮾鯂鯃鯅鯋鯌鯍鯎鯏鯐鯑鯒鯓鯘鯚鯜鯞鯟鯣鯦鯩鯬鯭鯯鯱鯲鯳鯴鯵鯶鯹鯺鯻鯼鯾鰀鰃鰄鰇鰊鰌鰎鰑鰔鰖鰗鰘鰙鰚鰝鰞鯝鯮鯿鰁鰂鰏鰐鰕鰛鰟鯄鯆鯕鯙鯥鯸鰅鰆鰋鰠鰡鰢鰧鰪鰬鰯鰰鰴鰸鰿鱁鱂鱃鱊鱋鱌鱍鱏鱑鱕鱙鱚鱛鱜鱞鱡鱢鱦鱩鱪鱫鱬鱰鱱鱳鱴鱶鱹鱼鲁鰦鰮鰵鰺鱅鱇鱓鱝鱤鱽鱾鱿鲀鲂鲃鱥鱯鱲鱻鰤鰨鰳鰶鰽鱀鱎鱐鱵鲓鲬鲺鳂鳉鳋鲍鲜鲤鲸鳃鳖鳞鲄鲅鲆鲇鲈鲉鲊鲋鲌鲎鲏鲐鲑鲒鲔鲕鲖鲗鲘鲙鲚鲛鲝鲞鲟鲠鲡鲢鲣鲥鲦鲧鲨鲩鲪鲫鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲹鲻鲼鲽鲾鲿鳀鳁鳄鳅鳆鳇鳈鳊鳌鳍鳎鳏鳐鳑鳒鳓鳔鳕鳗鳘鳙鳚鳛鳜鳝鳟鳠鳡鳢鳣鳤鳨鳪鳭鳮鳰鳱鳵鳸鳹鳺鳼鳿鴀鴁鴅鴊鴋鴌鴍鴏鴐鴑鴓鴖鴘鴙鴚鴡鴤鴧鴩鴫鴬鴭鴮鴱鴲鴵鴶鴸鴹鴺鴼鴾鵃鵄鵅鵆鵇鵈鵉鵊鵋鳫鳬鳯鳾鴂鴎鴜鴪鴴鳻鴄鴔鴯鴠鴢鵌鵍鵎鵏鵔鵕鵘鵚鵛鵢鵣鵤鵥鵦鵧鵨鵭鵱鵳鵴鵸鵹鵼鵽鵿鶀鶁鶃鶄鶅鶆鶈鶋鶌鶍鶎鶐鶑鶔鶙鶛鶜鶝鶞鶟鶠鶢鶣鶧鶨鶫鶭鶮鵐鵞鵮鵶鵺鵾鶏鶓鶕鶥鵖鵗鵙鵫鵵鶇鶦鶰鶳鶶鶷鶽鶾鷅鷆鷋鷌鷍鷎鷐鷑鷒鷔鷘鷛鷜鷝鷠鷡鷢鷣鷤鷧鷨鷪鷮鷱鷵鷶鷷鷻鷼鸀鸃鸄鸅鸆鸈鸉鸋鸍鷄鷉鸊鸌鸎鶲鶵鶸鷀鷏鷬鷭鷰鷴鸁鸓鸔鸗鸙鸼鹶鹷鸟鸡鸣鸥鸦鸭鸯鸳鸵鸽鸿鹃鹅鹊鹏鹤鹰鸖鸘鸜鸠鸢鸤鸧鸨鸩鸪鸫鸬鸮鸰鸱鸲鸴鸶鸷鸸鸹鸺鸻鸾鹀鹁鹂鹄鹆鹇鹈鹉鹋鹌鹍鹎鹐鹑鹒鹓鹔鹕鹖鹗鹘鹙鹚鹛鹜鹝鹞鹟鹠鹡鹢鹣鹥鹦鹧鹨鹩鹪鹫鹬鹭鹮鹯鹱鹲鹳鹴麆麉麊麍麎麏麔麘麙麜麡麢麧麨麬麱麲麳麶麷麹黂黅黆黊黋黖黚麦黄鹸鹻鹾麁麄麅麐麕麖麞麣麪麫麯麸麺麽麿黁黇黉黒黗黙麚麠麭黀黣黤黫黬黭黳黵黸黺鼀鼁鼆鼊鼌鼑鼔鼘鼜鼝鼞鼣鼤鼥鼦鼧鼨鼮鼰鼲鼳鼵鼶鼸鼺鼼鼿黡黢黩黪黱黾鼂鼃鼄鼅鼋鼍鼈鼗鼟鼡鼹鼪鼭齀齂齃齄齅齍齓齖齘齛齝齤齥齨齫齭齳齴齸齹齺齻齼齽龏龓龗龝龞龟龠龡龢龣齐齿龄龋龙龚齑齚齢齩龀龁龂龃龅龆龇龈龉龊龌龎龖龛齈龒龘俹凤凧哟啯喩喴喷営喸喹喺啳啹啿喅喍喐喕喖喗喛喞喠喡喢喯嗂嗋嗏啮啸啬啰啱啲啴啺啭喆喰喼喽喾嗁喥喱喿嗪嗬嗰嗞嗻嘅嘑嘊嘚嘞嘠嘡嘢嘥嘦噇噏噔噻噷嚱坏坂垍垡埝壠媍嫤嫧嫯嫲嫼嫾嬄嬆嬊嬍嬎嬑嬒嬕嬘嬜嬟嬩嬱嬳嬵嬶嬺嬻孁孂孆嬇嬚嬠嬣嫴嬁嬂嬏嬞嬧嬨嬼孇丳棇丮丯丰丱襾豊辵迋迓迕逑逯逶遘遴遶邇邋邐邘邙邡邢邰邶邾郅郈咦牚榦侄","obvious = 佒伉佰倓倬偎偝偟偩傒傖傜傯僑僖僮僾儋儐儓儜儤儱儷冱剄刖刵劻匟卓厔厘厞厶叕仞仟仮伕佤佧佴佶佺佻佽侉侊侜侹俅俵倀倞倣倬傃僨兹冓冞凔刨剕劐匴吡吆呎呔呤呿咡咺咾哃哔哗哚哧哢哫唁唂唑唲啁啅啎啵啶喈喌喑喓喨喭嗖嘸噍噗噚噫嚄嚜嚦嚬嚶囀囈囌囿圩圇圊坩坵垌垮坱埕埤埧埴埸堇堉埼堍堠塽塿墀墁墉墦壅壕壚壠壩奕奘奚妗妺姍姞姺娼婊婞婷媖媢媬媾嫄嫈嫏嫖嫚嫜嫡嫫嫥嫭嫻嫽嫿嬃嬖嬙嬡嬯嬴孳宥宬寀寎寔尪尰屌屝屴岈岡岢岬岱岷峙峿崆崍崦崧崮崱崴嵂嵋嵫嶁嶂嶒嶔嶙嶝嶠嶪嶷嶸巃幀帟幃幄幘幛幞幩幪幮幵庥廋弈弒弝弣弤廞廕徨徯忉忝忮恉恌恔忸悕悾悱惎惏惓惔惛惝愍愐愔愮慅慥憺懅懞懠懫憎憙憪憮懰扆懮抆抻挌捯掬掯掱掾揎搌搆搎搵搧摺摹摽摓撟撧撙撖撏擯擭擐擂擀攖攛攧攩攪攷敉敔敧敧敺旄旒旛旟旡昉昜昡晅晞暋暐暘晻暠暡曈曏曙曚曨輈朓朣朳朿杅杗枒枇枌枓栭栱栲栳栵栻桄桅桉桓桲梃梐梗梠梩棐棜棬棰棻棼椄椐椑椗椹楄楛楝楠楢楦楨楸榧榘榾槎槤槻樅瑾慬殣墐槿鹵磠樐蓾樠樴樾橿檍檑檣檥櫈櫌櫞櫨櫪櫫櫬櫳欂欏欐欛歈歟殙殛殜殠殤殫殭汾沁沄沅沍沓沕沘沚沭沼沽泅泌泗泚泠泫泭泱洄洌洎洏洑洙洚洭洳洸洺浠浡浯浹涇涫涷淜淝淞淯淶渙渟渢渤渨渭渲渺湄湜湝湞湟湣溉溏溲滁滂滃滄滎滏滻漈漊漳潀潯潼潾澇澍澐濔澦澧澴澹濂濘濜濠濩濮濰瀆瀁瀅瀘瀛瀠瀡瀨瀼灃灄灌灞炤炱炔烋烜烯烽焐焯煇煒煬煻熅熳燋燐燖燔燜牣牯牴牷牾犆犍犎犢狁狃狙狫狳狴猁猓猘猞猺猿獍獠獼掬椈踘玀玖玗玟玠玢玥玦玳玼珅珂珉珊珌珓珙珞珥珮珵珽琇琊琚琪琬琭琯琺瑄瑋瑛瑢瑭瑯瑽瑾瑿璁璉璋璘璜璠璞璣璦璪璫璵瓔瓚瓬瓴甑甒甔甖甬畎畹畿疔疥疧疱疳疸疹痁痌痗胰荑洟痍侇桋痢痯痳瘁瘃瘉瘊瘕瘖瘙瘲癤癃癇癉癔癘癙癥癩癬癭皁盂盬盲眊眕眚眩睇睎睠睺瞍瞖瞵瞷瞽矯矰砆砑砢砫砮砷硃硎硨硭硼碇碔碘碡碫碲碳磁磴磷礄礌礓礞礱礴祂祉祏祔祗祧祺禘禛禡禨禰秕秣秫秬稙稛稨稹穄穊穜穠竽笈笠笥笭笳筅筊筌筘筧筩筯筰筳筴筵箏箙箜箠箮箯箕篁篌篚篛篝篨篰篳篼簀簃簏簞簦簹籓籔籙籣籩籪籯籹粔粞粢粳粻粿糅糜籽糢糬紆紈紉紜紝紟紺紾絃絿綀綃綆綈綎綖綣綸綺緗緡緦緶緹縈縋縏縭縳縵繄繇繈繒繖繙繣繨繯纆纜罃罌罟罠罳罶罾罿羝羭羱羲翀翎翮耄耔耘耞耬耰聹肕胂肽胔胗胠胦胯胹胺脡脢脰腄腒腓腧腶腺膂膇膞膣膦膰膿臌臏臧臿舠舢舫舲舷舺艅艉艋艎艏艖艟艤艨艭芊芍芏芙芥芨芴芷苺芼苓苙苜苡苣苯苻苾茈茉茖茨茬茭茱茲茳茵茹茼荃荅荇荊荱荵莎莓莕莘莙莛莢莿菔菘菖菟菢菝菫菰菴菻萇萊萋萌萣萱萴葆葍葎葑葒葖葚葦葧葭葳葶葹葽蒔蒗蒞蒟蒢蒺蒻蓀蓊蓫蓯蓷蓿蔀蔇蔉蔎蔞蔦蔯蕁蕃蕎蕑蕓蕕蕝蕞蕹薆薈薌薏薔薜薠薢薴薹藎藩藭藶藻藾蘁蘋蘚蘘蘢虖虩蚌蚜蚡蚣蚧蚨蚪蚰蚴蚵蚶蚹蚿蛄蛉蛐蛜蛸蛹蛺蜈蜙蜞蜢蜱蜾蝀蝌蝒蝓匽蝘堰偃郾鼴蝙蝟蝮蝳蝻螃螅螈螗螵螿蟅蟟蟢蟣蟥蟭蟳蟷蠁蠅蠐蠑蠓蠔蠣衈衒衕衚衩袈袗袪袼袽裀裊裎裟裲裾褊褓褔褕褡褱褳褵褽襁襉襌襛襞襴襶襻襼覘覜覯覲觖觜觝觡觩觴觷訒訧証訾詁詅詆詎詘詼誋誹諆諍諟諠萁娸匋淘綯啕諵謚謨謼譆譟讆讕讜谿豋豌豝豨豭豵貅貘貰貲賕賙賚賮賾贐贕赯赸趑趫趮趲趹跆跏跐跗跚跣跦跧跼跽踉踔踡蹂蹅蹓蹕蹜蹣蹯蹻蹼躄躐躗軔軨軫軹軻輀輇輈輊輞輠輣輮輴輹轀轅轔轘轙轤郕郚郛郜郟郠郪郫郯郲郴鄇鄎郿鄔鄘鄚鄣鄤鄧鄫鄬鄯鄴鄾酆酇酈酚酤酮酯酲酵酶醁醃醐醚醛醣醨醭醮醲醴醵醾釉釔釕釜釢釤釩釷釹鈀鈁鈇鈒鈥鈦鈧鈰鈳鈷鈹鈺鈽鈾鉉鉋鉍鉠鉥鉞鉦鉧鉭鉲鉶鉸鉺銃銍銑銓銠銣銥銦銧銩銪銫銶銻鋂鋇鋏鋙鋦鋨鋩鋮鋰鋹錏錒錛錟錡峨莪硪錨錩錸鍆鍚鍠鍤鍭鍶鍺鎏鎘鎢鎦鎩鎪鎰鎴鎵鏌鏜鏞鏦鐇鐒鐙鐠鐮鐶鐻鐿鑀鑊鑌鐨鑐鑒鑔鑖鑞鑟鑢鑤鑥鑧鑨鑩鑪鑬鑭鑮鑹鑻閌閑閟閬閭閶閹閽闤阯阰阱陂陲陴隃隄隈隉隍隴雍雘雰霂霏霖霙霤靉靚靪靳靷靺鞅鞚鞣鞬韁韅韔韙韝頖頲顙顢颸颺颻飣飶餈餑餖餤餧餬餱餿饈饑饔馝馡馴馹駜駟駬駰騂騃騄騋騕騖騠騮騵騸驂驃驄驊驎驖驪骴骾髏髕髖髭鬃鬅鬈鬒鬘魈魍魎魴鮐鮒鮞鮦鮫鯖鯠鯡鯧鯷鰉鰒鰩鰫鰣鰱鰷鰼鱄鱆鱉鱘鱧鱨鳦鳷鴃鴒鴗鴷鴽鵀鵁鵂鵓鵜鵩鶖鶗鶘鶩鶬鸑鶹鷁鷂鷓鷖鷞鷦鷥鷩鷯鷲鷳鷺鷽鷾鸒鸕鸝麝麟麮黰黲黷黿鼕鼙鼚鼢鼫鼬鼯鼷齾躓鈸魃茇軷昵旎怩柅鈮窿橕"],
		'js': function() {
			set("knownLength", get("known").length);
			
			squiffy.set("familiar", squiffy.get("known").replace(/[\[\]]/g, "").length);
			
			var known = new RegExp("([" + get("known") + "])", "g");
			
			set("obvious", get("obvious").replace(known, ""));
			var obsoleteX = new RegExp("([" + get("obsolete") + get("obvious") + "])", "g");
			    set("known", [...new Set((get("known") + get("obsolete") + get("obvious")).split(''))].sort().join(''));
			    set("known", get("known")
			    .replace(/./g, function(character) {return `&#${character.charCodeAt(0)};`})//convert to hex
			
			    .replace(/(&#...00;)(&#...01;)/g, "$1*$2")
			    .replace(/(&#...01;)(&#...02;)/g, "$1*$2")
			    .replace(/(&#...02;)(&#...03;)/g, "$1*$2")
			    .replace(/(&#...03;)(&#...04;)/g, "$1*$2")
			    .replace(/(&#...04;)(&#...05;)/g, "$1*$2")
			    .replace(/(&#...05;)(&#...06;)/g, "$1*$2")
			    .replace(/(&#...06;)(&#...07;)/g, "$1*$2")
			    .replace(/(&#...07;)(&#...08;)/g, "$1*$2")
			    .replace(/(&#...08;)(&#...09;)/g, "$1*$2")
			    .replace(/(&#...09;)(&#...10;)/g, "$1*$2")
			    
			    .replace(/(&#...10;)(&#...11;)/g, "$1*$2")
			    .replace(/(&#...11;)(&#...12;)/g, "$1*$2")
			    .replace(/(&#...12;)(&#...13;)/g, "$1*$2")
			    .replace(/(&#...13;)(&#...14;)/g, "$1*$2")
			    .replace(/(&#...14;)(&#...15;)/g, "$1*$2")
			    .replace(/(&#...15;)(&#...16;)/g, "$1*$2")
			    .replace(/(&#...16;)(&#...17;)/g, "$1*$2")
			    .replace(/(&#...17;)(&#...18;)/g, "$1*$2")
			    .replace(/(&#...18;)(&#...19;)/g, "$1*$2")
			    .replace(/(&#...19;)(&#...20;)/g, "$1*$2")
			    
			    .replace(/(&#...20;)(&#...21;)/g, "$1*$2")
			    .replace(/(&#...21;)(&#...22;)/g, "$1*$2")
			    .replace(/(&#...22;)(&#...23;)/g, "$1*$2")
			    .replace(/(&#...23;)(&#...24;)/g, "$1*$2")
			    .replace(/(&#...24;)(&#...25;)/g, "$1*$2")
			    .replace(/(&#...25;)(&#...26;)/g, "$1*$2")
			    .replace(/(&#...26;)(&#...27;)/g, "$1*$2")
			    .replace(/(&#...27;)(&#...28;)/g, "$1*$2")
			    .replace(/(&#...28;)(&#...29;)/g, "$1*$2")
			    .replace(/(&#...29;)(&#...30;)/g, "$1*$2")
			    
			    .replace(/(&#...30;)(&#...31;)/g, "$1*$2")
			    .replace(/(&#...31;)(&#...32;)/g, "$1*$2")
			    .replace(/(&#...32;)(&#...33;)/g, "$1*$2")
			    .replace(/(&#...33;)(&#...34;)/g, "$1*$2")
			    .replace(/(&#...34;)(&#...35;)/g, "$1*$2")
			    .replace(/(&#...35;)(&#...36;)/g, "$1*$2")
			    .replace(/(&#...36;)(&#...37;)/g, "$1*$2")
			    .replace(/(&#...37;)(&#...38;)/g, "$1*$2")
			    .replace(/(&#...38;)(&#...39;)/g, "$1*$2")
			    .replace(/(&#...39;)(&#...40;)/g, "$1*$2")
			    .replace(/(&#...40;)(&#...41;)/g, "$1*$2")
			    .replace(/(&#...41;)(&#...42;)/g, "$1*$2")
			    .replace(/(&#...42;)(&#...43;)/g, "$1*$2")
			    .replace(/(&#...43;)(&#...44;)/g, "$1*$2")
			    .replace(/(&#...44;)(&#...45;)/g, "$1*$2")
			    .replace(/(&#...45;)(&#...46;)/g, "$1*$2")
			    .replace(/(&#...46;)(&#...47;)/g, "$1*$2")
			    .replace(/(&#...47;)(&#...48;)/g, "$1*$2")
			    .replace(/(&#...48;)(&#...49;)/g, "$1*$2")
			    .replace(/(&#...49;)(&#...50;)/g, "$1*$2")
			    
			    .replace(/(&#...50;)(&#...51;)/g, "$1*$2")
			    .replace(/(&#...51;)(&#...52;)/g, "$1*$2")
			    .replace(/(&#...52;)(&#...53;)/g, "$1*$2")
			    .replace(/(&#...53;)(&#...54;)/g, "$1*$2")
			    .replace(/(&#...54;)(&#...55;)/g, "$1*$2")
			    .replace(/(&#...55;)(&#...56;)/g, "$1*$2")
			    .replace(/(&#...56;)(&#...57;)/g, "$1*$2")
			    .replace(/(&#...57;)(&#...58;)/g, "$1*$2")
			    .replace(/(&#...58;)(&#...59;)/g, "$1*$2")
			    .replace(/(&#...59;)(&#...60;)/g, "$1*$2")
			    
			    .replace(/(&#...60;)(&#...61;)/g, "$1*$2")
			    .replace(/(&#...61;)(&#...62;)/g, "$1*$2")
			    .replace(/(&#...62;)(&#...63;)/g, "$1*$2")
			    .replace(/(&#...63;)(&#...64;)/g, "$1*$2")
			    .replace(/(&#...64;)(&#...65;)/g, "$1*$2")
			    .replace(/(&#...65;)(&#...66;)/g, "$1*$2")
			    .replace(/(&#...66;)(&#...67;)/g, "$1*$2")
			    .replace(/(&#...67;)(&#...68;)/g, "$1*$2")
			    .replace(/(&#...68;)(&#...69;)/g, "$1*$2")
			    .replace(/(&#...69;)(&#...70;)/g, "$1*$2")
			    
			    .replace(/(&#...70;)(&#...71;)/g, "$1*$2")
			    .replace(/(&#...71;)(&#...72;)/g, "$1*$2")
			    .replace(/(&#...72;)(&#...73;)/g, "$1*$2")
			    .replace(/(&#...73;)(&#...74;)/g, "$1*$2")
			    .replace(/(&#...74;)(&#...75;)/g, "$1*$2")
			    .replace(/(&#...75;)(&#...76;)/g, "$1*$2")
			    .replace(/(&#...76;)(&#...77;)/g, "$1*$2")
			    .replace(/(&#...77;)(&#...78;)/g, "$1*$2")
			    .replace(/(&#...78;)(&#...79;)/g, "$1*$2")
			    .replace(/(&#...79;)(&#...80;)/g, "$1*$2")
			    
			    .replace(/(&#...80;)(&#...81;)/g, "$1*$2")
			    .replace(/(&#...81;)(&#...82;)/g, "$1*$2")
			    .replace(/(&#...82;)(&#...83;)/g, "$1*$2")
			    .replace(/(&#...83;)(&#...84;)/g, "$1*$2")
			    .replace(/(&#...84;)(&#...85;)/g, "$1*$2")
			    .replace(/(&#...85;)(&#...86;)/g, "$1*$2")
			    .replace(/(&#...86;)(&#...87;)/g, "$1*$2")
			    .replace(/(&#...87;)(&#...88;)/g, "$1*$2")
			    .replace(/(&#...88;)(&#...89;)/g, "$1*$2")
			    .replace(/(&#...89;)(&#...90;)/g, "$1*$2")
			    
			    .replace(/(&#...90;)(&#...91;)/g, "$1*$2")
			    .replace(/(&#...91;)(&#...92;)/g, "$1*$2")
			    .replace(/(&#...92;)(&#...93;)/g, "$1*$2")
			    .replace(/(&#...93;)(&#...94;)/g, "$1*$2")
			    .replace(/(&#...94;)(&#...95;)/g, "$1*$2")
			    .replace(/(&#...95;)(&#...96;)/g, "$1*$2")
			    .replace(/(&#...96;)(&#...97;)/g, "$1*$2")
			    .replace(/(&#...97;)(&#...98;)/g, "$1*$2")
			    .replace(/(&#...98;)(&#...99;)/g, "$1*$2")
			    .replace(/(&#...99;)(&#...00;)/g, "$1*$2")
			    .replace(/&#(\d+);/g, function(match, number){ return String.fromCharCode(number); })
			    
			    
			    .replace(obsoleteX, "($1)")//obsolete list
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)\*/g, "*")
			    .replace(/\*\(.\)([^\*])/g, "$1")
			    .replace(/([^\*])\(.\)\*/g, "$1")
			    .replace(/\(.\)/g, "")
			    .replace(/\*.\*/g, "-")
			    .replace(/-.\*/g, "-")
			    .replace(/\*.-/g, "-")
			    .replace(/-.-/g, "-")
			    .replace(/-.-/g, "-")
			    .replace(/-.-/g, "-")
			    .replace(/-.-/g, "-")
			    .replace(/--/g, "-")
			    .replace(/\*/g, "")
			    );
			set("MyCharacters", decodeURI(squiffy.ui.processText("{MyCharacters1}{known}{MyCharacters2}")));
		},
		'passages': {
			'copy': {
				'text': "<p>Bookmarklet copied to clipboard.</p>",
				'js': function() {
					var textarea = document.createElement('textarea');
					textarea.value = get("MyCharacters");
					document.body.appendChild(textarea);
					textarea.select();
					document.execCommand('copy');
					document.body.removeChild(textarea);
					
				},
			},
		},
	},
	'next box': {
		'text': "<textarea id =\"story\" style=\"width:100%\"></textarea>\n\n<p><a class=\"squiffy-link link-section\" data-section=\"Text Analysis\" role=\"link\" tabindex=\"0\">Text Analysis</a></p>\n<ol start=\"9\">\n<li>You can also use this bookmarklet to get a less detailed <a href=\"{TextAnalysis}\">Text Analysis</a> after clicking the &quot;My Characters&quot; bookmarklet.</li>\n</ol>",
		'attributes': ["TextAnalysis2 =  : 0; var hours = Math.floor(totalMinutes / 60); var minutes = Math.round(totalMinutes % 60); var readingTime = (chineseCharCount > 0) ? (hours + %22 hour%22 + (hours !== 1 ? %22s%22 : %22%22) + %22, %22 + minutes + %22 minutes%22) : %22N/A%22; alert(%22Chinese Characters: %22 + chineseCharCount + %22\\nKnown Chars: %22 + knownCharCount + %22\\nReadability: %22 + readability + %22%\\nReading time: %22 + readingTime);})();","TextAnalysis := {TextAnalysis1}{CPM}{TextAnalysis2}"],
		'passages': {
		},
	},
	'Text Analysis': {
		'text': "<p>{@ZPD*=1}<!---Weird bug--->\nI can pronounce {ZPD}% of this {StoryLength} characters long text. ({if ZPD&lt;85:Frustration level}{if ZPD&gt;=85:{if ZPD&lt;97:It&#39;s within my {rotate:ZPD:Zone of Proximal Development}!}}{if ZPD&gt;=97:An easy read.})</p>\n<p>It will take at least {ReadingHours} hour{if ReadingHours&gt;1:s}{if ReadingHours=0:s},  {ReadingMinutes} minutes to read. ({CPM} {rotate:CPM:estimated Characters per Minute})</p>\n<p>I know {AlreadyKnown} out of {total} characters that appear in this text. ({percent}%)</p>\n<p>Highlight a character to get its <a href=\"https://hanziyuan.net/#SELECTION\" onclick=\"event.preventDefault(); var selectedText = document.getSelection().toString(); var url = this.href.replace('SELECTION', encodeURIComponent(selectedText)); window.open(url, '_blank');\">Etymology</a> or <a href=\"https://hanzicraft.com/character/SELECTION#info\" onclick=\"event.preventDefault(); var selectedText = document.getSelection().toString(); var url = this.href.replace('SELECTION', encodeURIComponent(selectedText)); window.open(url, '_blank');\">Statistics</a>. These are in descending order of instances.</p>\n<p>I don&#39;t know these {many} characters:<big>{vocab}</p>",
		'js': function() {
			set("knownRaw", "[" + get("knownRaw") + "]");
			squiffy.set("story", jQuery("#story").val());
			var text = squiffy.get("story")
				.replace(/[^\u4e00-\u9fa5\s]|\s/g, "") // remove special characters except Chinese
				.replace(/[0-9]/g, ""); // remove digits
			set("StoryLength", text.length); //Total length of the text
			var total = [...new Set(text.split(""))].join("");
			var vocab = text.replace(new RegExp(squiffy.get("knownRaw"), "gi"), ""); // remove familiar characters
			set("StoryRemainder", vocab.length); //Text length without known characters
			// Count the occurrences of each character
			var characterCounts = {};
			vocab.split("").forEach(function (char) {
				    characterCounts[char] = (characterCounts[char] || 0) + 1;
			});
			// Sort characters by frequency
			var sortedChars = Object.keys(characterCounts).sort(function (a, b) {
				return characterCounts[b] - characterCounts[a];
			});
			// Insert frequency digits in front of each group
			var result = [];
			var currentFrequency = null;
			sortedChars.forEach(function (char) {
				var frequency = characterCounts[char];
				if (frequency !== currentFrequency) {
			    result.push(frequency.toString()); // Insert the frequency digit
			    currentFrequency = frequency;
				}
				result.push(char); // Add the character
			});
			// Now sortedChars contains the list with frequency digits prefacing each group
			sortedChars = result;
			 var AlreadyKnown = total.length - sortedChars.length;
			squiffy.set("vocab", sortedChars);
			squiffy.set("many", sortedChars.length);
			squiffy.set("AlreadyKnown", AlreadyKnown);
			squiffy.set("familiar", squiffy.get("known").replace(/[\[\]]/g, "").length);
			squiffy.set("total", total.length);
			squiffy.set("percent", (AlreadyKnown / total.length * 100).toFixed());
			squiffy.set("density", (get("many") / (get("StoryRemainder"))).toFixed(2) * 100);
			var ZPD = (((get("StoryLength") - get("StoryRemainder")) / get("StoryLength")) * 100);
			squiffy.set("ZPD", ZPD.toFixed(1));
			set("ReadingMinutes", Math.ceil(get("StoryLength") / get("CPM")));
			set("ReadingHours", Math.floor(get("ReadingMinutes") / 60));
			set("ReadingMinutes", (get("ReadingMinutes") % 60).toFixed());
			
			if (get("ReadingMinutes") >= 60) {
			set("ReadingHours", get("ReadingHours") + 1);
			set("ReadingMinutes", get("ReadingMinutes") - 60);}//My dumb bug makes 60 minutes a possiblility. Sheesh.
		},
		'passages': {
		},
	},
	'Bujian': {
		'clear': true,
		'text': "<textarea id=\"record\" rows=\"3\" style=\"font-family:'ToneOZ-Pinyin-Kai-Traditional', Pinyin01; font-size:140%; width:100%;\">{if record&gt;0:{record}}</textarea>•<a class=\"squiffy-link link-section\" data-section=\"Glossary\" role=\"link\" tabindex=\"0\">MDBG</a> •<a class=\"squiffy-link link-section\" data-section=\"Translate\" role=\"link\" tabindex=\"0\">Translate</a> •<a href=\"https://dict.revised.moe.edu.tw/search.jsp?md=1&word=SELECTION#searchL\" onclick=\"event.preventDefault(); var selectedText = document.getSelection().toString(); var url = this.href.replace('SELECTION', encodeURIComponent(selectedText)); window.open(url, '_blank');\">TWDictionary</a>¹ •<a href=\"https://hanziyuan.net/#SELECTION\" onclick=\"event.preventDefault(); var selectedText = document.getSelection().toString(); var url = this.href.replace('SELECTION', encodeURIComponent(selectedText)); window.open(url, '_blank');\">Etymology</a>¹ •<a class=\"squiffy-link link-section\" data-section=\"s2, p=&#917985;\" role=\"link\" tabindex=\"0\">ㄅ</a> <br><br><input id=\"Bujian search\" style=\"width:10em; font-family:'ToneOZ-Pinyin-Kai-Traditional', Pinyin01; font-size:140%;\" value =\"{if seen s:{Bujian search}}\" placeholder=\"Click or type bujian\">  • <a class=\"squiffy-link link-section\" data-section=\"Bujian Search, e=ZiTools\" role=\"link\" tabindex=\"0\">ZiTools</a> • <a class=\"squiffy-link link-section\" data-section=\"Bujian Search, e=ZiHi2\" role=\"link\" tabindex=\"0\">Zdic</a>² • <a class=\"squiffy-link link-section\" data-section=\"Bujian Search, e=ZiHi\" role=\"link\" tabindex=\"0\">Zi-hi</a>² • <a class=\"squiffy-link link-section\" data-section=\"Bujian Search, e=MOE\" role=\"link\" tabindex=\"0\">MOE Variants</a> • <a class=\"squiffy-link link-section\" data-section=\"Draw it\" role=\"link\" tabindex=\"0\">Draw it</a><br><br>\n<span style=\"font-family:'ToneOZ-Pinyin-Kai-Traditional',Pinyin01; font-size:190%;\">\n1<a class=\"squiffy-link link-section\" data-section=\"s, b=丨\" role=\"link\" tabindex=\"0\">丨</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=丿\" role=\"link\" tabindex=\"0\">丿</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=丶\" role=\"link\" tabindex=\"0\">丶</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=㇂\" role=\"link\" tabindex=\"0\">㇂</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=㇒\" role=\"link\" tabindex=\"0\">㇒</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=乚\" role=\"link\" tabindex=\"0\">乚</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=𠃊\" role=\"link\" tabindex=\"0\">𠃊</a><br>\n2<a class=\"squiffy-link link-section\" data-section=\"s,b=刂\" role=\"link\" tabindex=\"0\">刂</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=亻\" role=\"link\" tabindex=\"0\">亻</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=冖\" role=\"link\" tabindex=\"0\">冖</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=厂\" role=\"link\" tabindex=\"0\">厂</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=卩\" role=\"link\" tabindex=\"0\">卩</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=冂\" role=\"link\" tabindex=\"0\">冂</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=勹\" role=\"link\" tabindex=\"0\">勹</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=阝\" role=\"link\" tabindex=\"0\">阝&#917985;</a><br>\n3<a class=\"squiffy-link link-section\" data-section=\"s, b=氵\" role=\"link\" tabindex=\"0\">氵</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=忄\" role=\"link\" tabindex=\"0\">忄</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=辶\" role=\"link\" tabindex=\"0\">辶</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=弋\" role=\"link\" tabindex=\"0\">弋</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=彐\" role=\"link\" tabindex=\"0\">彐</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=扌\" role=\"link\" tabindex=\"0\">扌</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=犭\" role=\"link\" tabindex=\"0\">犭</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=艹\" role=\"link\" tabindex=\"0\">艹</a><br>\n4<a class=\"squiffy-link link-section\" data-section=\"s, b=灬\" role=\"link\" tabindex=\"0\">灬</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=爫\" role=\"link\" tabindex=\"0\">爫</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=廴\" role=\"link\" tabindex=\"0\">廴</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=戈\" role=\"link\" tabindex=\"0\">戈</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=爿\" role=\"link\" tabindex=\"0\">爿</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=屯\" role=\"link\" tabindex=\"0\">屯</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=攵\" role=\"link\" tabindex=\"0\">攵&#917985;</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=歹\" role=\"link\" tabindex=\"0\">歹</a><br>\n5<a class=\"squiffy-link link-section\" data-section=\"s, b=皿\" role=\"link\" tabindex=\"0\">皿</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=罒\" role=\"link\" tabindex=\"0\">罒</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=幺\" role=\"link\" tabindex=\"0\">幺</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=禾\" role=\"link\" tabindex=\"0\">禾</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=𧘇\" role=\"link\" tabindex=\"0\">𧘇</a> <a class=\"squiffy-link link-section\" data-section=\"s,, b=业\" role=\"link\" tabindex=\"0\">业</a><br>\n6<a class=\"squiffy-link link-section\" data-section=\"s, b=舟\" role=\"link\" tabindex=\"0\">舟</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=臼\" role=\"link\" tabindex=\"0\">臼</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=糸\" role=\"link\" tabindex=\"0\">糸</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=耒\" role=\"link\" tabindex=\"0\">耒</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=艮\" role=\"link\" tabindex=\"0\">艮</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=缶\" role=\"link\" tabindex=\"0\">缶</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=虫\" role=\"link\" tabindex=\"0\">虫</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=虍\" role=\"link\" tabindex=\"0\">虍</a><br>\n7<a class=\"squiffy-link link-section\" data-section=\"s, b=谷\" role=\"link\" tabindex=\"0\">谷</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=甫\" role=\"link\" tabindex=\"0\">甫</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=豕\" role=\"link\" tabindex=\"0\">豕</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=臣\" role=\"link\" tabindex=\"0\">臣</a> <a class=\"squiffy-link link-section\" data-section=\"s,b=豸\" role=\"link\" tabindex=\"0\">豸</a><br>\n8<a class=\"squiffy-link link-section\" data-section=\"s, b=隹\" role=\"link\" tabindex=\"0\">隹</a> <a class=\"squiffy-link link-section\" data-section=\"s, b=隶\" role=\"link\" tabindex=\"0\">隶&#917985;</a></span><br>\n¹ Highlight specific characters before clicking.<br>\n² Ctrl+v in the search bar. \n\n<textarea id=\"notepad\" rows=\"2\" style=\"font-family:Pinyin01; font-size:140%; width:100%;\" placeholder=\"Notes\">{if notepad&gt;0:{notepad}}</textarea>",
		'attributes': ["HZCraftComponent = javascript:(function(){var appearsInBoxes=document.querySelectorAll('.appearsinbox');var charactersMap={};appearsInBoxes.forEach(function(box){var characters=box.textContent.trim().split('');characters.forEach(function(char){if(!charactersMap[char]){charactersMap[char]=1}else{charactersMap[char]++}})});var commonCharacters=Object.keys(charactersMap).filter(function(char){return charactersMap[char]===appearsInBoxes.length});if(commonCharacters.length>0){alert('Common Characters: '+commonCharacters.join(', '))}else{alert('No common characters found.')}})();"],
		'passages': {
		},
	},
	'Draw it': {
		'text': "<!---<iframe src=\"https://www.qhanzi.com/\" scrolling=\"no\" loading=\"lazy;\" style=\"height:1000px; width:75%; border:none;\"></iframe>--->",
		'js': function() {
			window.open("https://www.qhanzi.com/#drawkanji-canvas");
			squiffy.story.go("Bujian")
		},
		'passages': {
		},
	},
	'Glossary': {
		'text': "",
		'js': function() {
			window.open("https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=1&wdqtm=0&wdqcham=1&wdqt=" + encodeURI(get("record").replace(/󠇡/g,"")) + "#wordlistlink");
			squiffy.story.go("Bujian")
		},
		'passages': {
		},
	},
	'Translate': {
		'text': "",
		'js': function() {
			window.open("https://translate.google.com/?sl=zh-TW&tl=en&text=" + encodeURI(get("record").replace(/󠇡/g,"") + "&op=translate#ucj-12"));
			squiffy.story.go("Bujian")
		},
		'passages': {
		},
	},
	'Etymology': {
		'text': "",
		'js': function() {
			window.open("https://hanziyuan.net/#" + encodeURI(get("record").replace(/󠇡/g,"")));
			squiffy.story.go("Bujian")
		},
		'passages': {
		},
	},
	'Bujian Search': {
		'text': "",
		'js': function() {
			var Bujian_search = squiffy.get("Bujian search")
			.replace(/黃/g, "黄")
			.replace(/產/g, "産")
			.replace(/一丿乚/g, "尢")
			.replace(/冖丿乚/g, "冘")
			.replace(/廿中三/g, "堇")
			.replace(/㇒㇒㇒/g, "彡")
			.replace(/人彡/g, "㐱")
			.replace(/㇒一/g, "𠂉")
			.replace(/丿乚/g, "儿")
			.replace(/厂𧘇/g, "辰")
			.replace(/乚日|日乚/g, "电")
			.replace(/丶丶/g, "冫")
			.replace(/十丶用/g, "甫")
			.replace(/丶一/g, "亠")
			.replace(/丶冖/g, "宀")
			.replace(/宀八/g, "穴")
			.replace(/冖[八]/g, "⺳")
			.replace(/丶厂/g, "广")
			.replace(/斤丶/g, "斥")
			.replace(/糸豕/g, "糸𧰨")
			.replace(/廿中/g, "革")
			.replace(/[丿厂][弋戈]/g, "戊")
			.replace(/弋㇒/g, "戈")
			.replace(/冫厂|冫广|冫厂丶/g, "疒")
			.replace(/羊取/g, "叢")
			.replace(/[口囗]丶[口囗]/g, "呂")
			.replace(/彐求|⺺[求小]/g, "隶")
			.replace(/人于/g, "余")
			.replace(/一非/g, "韭")
			.replace(/二人/g, "夫")
			.replace(/三人/g, "𡗗")
			.replace(/几又/g, "殳")
			.replace(/卩乚|乚卩/g, "㔾")
			.replace(/化/g, "亻匕")
			.replace(/允攵/g, "允夊")
			.replace(/片爿/g, "󰑉")
			.replace(/立豕/g, "立𧰨")
			;
			var textarea = document.createElement('textarea');
			textarea.value = Bujian_search;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			if (get("e") == "MDBG"){
			var Bujian_search = Bujian_search
			.replace(/⺺/g, "肀")
			.replace(/片爿/g, "𣶒");
			window.open("https://www.mdbg.net/chinese/dictionary?wdqchs=" + encodeURI(Bujian_search) + "##wordlistlink");}
			else if (get("e") == "HZC"){
			var Bujian_search = Bujian_search
			.replace(/片爿/g, "片一");
			window.open("https://hanzicraft-com.translate.goog/character/" + encodeURI(Bujian_search) + "?_x_tr_sl=zh-CN&_x_tr_tl=zh-TW");}
			else if (get("e") =="ZiHi"){
			var Bujian_search = Bujian_search
			.replace(/⺺/g, "𦘒")
			.replace(/片爿/g, "󰑉");
			window.open("https://zi-hi.com/sp/uni/CJKSeeker");}
			else if (get("e") =="ZiHi2"){
			var Bujian_search = Bujian_search;
			window.open("https://www.zdic.net/zd/hanseeker/?_x_tr_sl=zh-CN&_x_tr_tl=zh-TW&_x_tr_hl=en&_x_tr_pto=wapp#sk_logo");}
			else if (get("e") =="ZiTools"){
			var Bujian_search = Bujian_search;
			window.open("https://zi.tools/?secondary=search&query="+encodeURI(Bujian_search)+"#not-found");}
			else if (get("e") == "MOE"){
			var Bujian_search = Bujian_search;
			window.open("https://dict.variants.moe.edu.tw/search.jsp?ID=9&STR=" + encodeURI(Bujian_search));}
			squiffy.set("Bujian search", "")
			squiffy.story.go("Bujian")
			
		},
		'passages': {
		},
	},
	's': {
		'text': "",
		'js': function() {
			var b = squiffy.get("b")
			var Bujian_search = squiffy.get("Bujian search")
			squiffy.set("Bujian search", Bujian_search+=b)
			squiffy.story.go("Bujian")
		},
		'passages': {
		},
	},
	's2': {
		'text': "",
		'js': function() {
			var p = squiffy.get("p")
			var record = squiffy.get("record")
			squiffy.set("record", record+=p)
			squiffy.story.go("Bujian")
			//https://zi-hi.com/sp/uni/CJKSeeker
		},
		'passages': {
		},
	},
}
})();
