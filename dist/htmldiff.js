!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.HtmlDiff=e():t.HtmlDiff=e()}(window,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var i=e[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)n.d(r,i,function(e){return t[e]}.bind(null,i));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/dist/",n(n.s=0)}([function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=function t(e,n){this.MatchGranularityMaximum=4,this._content=[],this._newText=n,this._oldText=e;var r=this;this._specialCaseClosingTags={"</strong>":0,"</em>":0,"</b>":0,"</i>":0,"</big>":0,"</small>":0,"</u>":0,"</sub>":0,"</sup>":0,"</strike>":0,"</s>":0},this._specialCaseOpeningTagRegex=new RegExp(/<((strong)|(b)|(i)|(em)|(big)|(small)|(u)|(sub)|(sup)|(strike)|(s))[>\s]+/i),this._specialTagDiffStack=[],this._newWords,this._oldWords,this._matchGranularity,this._blockExpressions=[],this.RepeatingWordsAccuracy=1,this.IgnoreWhitespaceDifferences=!1,this.OrphanMatchThreshold=0,this.Build=function(){if(r._oldText==r._newText)return r._newText;i(),r._matchGranularity=Math.min(r.MatchGranularityMaximum,Math.min(r._oldWords.length,r._newWords.length));for(var t=u(),e=0;e<t.length;e++)s(t[e]);return r._content.join("")},this.AddBlockExpression=function(t){r._blockExpressions.push(t)};var i=function(){r._oldWords=t.WordSplitter.ConvertHtmlToListOfWords(r._oldText,r._blockExpressions),r._oldText=null,r._newWords=t.WordSplitter.ConvertHtmlToListOfWords(r._newText,r._blockExpressions),r._newText=null},s=function(e){switch(e.Action){case t.Action.Equal:d(e);break;case t.Action.Delete:l(e,"diffdel");break;case t.Action.Insert:a(e,"diffins");break;case t.Action.None:break;case t.Action.Replace:o(e)}},o=function(t){l(t,"diffmod"),a(t,"diffmod")},a=function(t,e){c("ins",e,r._newWords.slice(t.StartInNew,t.EndInNew))},l=function(t,e){c("del",e,r._oldWords.slice(t.StartInOld,t.EndInOld))},d=function(t){r._content.push(r._newWords.slice(t.StartInNew,t.EndInNew).join(""))},c=function(e,n,i){for(;i.length>0;){var s=h(i,function(e){return!t.Utils.IsTag(e)}),o="",a=!1;if(0!==s.length){var l=t.Utils.WrapText(s.join(""),e,n);r._content.push(l)}else if(r._specialCaseOpeningTagRegex.test(i[0])){if(r._specialTagDiffStack.push(i[0]),o='<ins class="mod">',"del"==e)for(i.shift();i.length>0&&r._specialCaseOpeningTagRegex.test(i[0]);)i.shift()}else if(r._specialCaseClosingTags.hasOwnProperty(i[0].toLowerCase())){var d=0===r._specialTagDiffStack.length?null:r._specialTagDiffStack.pop();if(null===d||d!=i[i.length-1].replace("/","")||(o="</ins>",a=!0),"del"==e)for(i.shift();i.length>0&&r._specialCaseClosingTags.hasOwnProperty(i[0].toLowerCase());)i.shift()}if(0===i.length&&0===o.length)break;a?r._content.push(o+h(i,t.Utils.IsTag).join("")):r._content.push(h(i,t.Utils.IsTag).join("")+o)}},h=function(t,e){for(var n=null,r=0;r<t.length;r++){var i=t[r];if(0===r&&" "==i&&(t[r]="&nbsp;"),!e(i)){n=r;break}}var s=void 0;return null!==n?(s=t.slice(0,n),n>0&&t.splice(0,n)):(s=t.slice(),t.splice(0)),s},u=function(){var e=0,n=0,i=[],s=f();s.push(new t.Match(r._oldWords.length,r._newWords.length,0));for(var o=p(s),a=0;a<o.length;a++){var l=e==o[a].StartInOld,d=n==o[a].StartInNew,c=null;(c=!1===l&&!1===d?t.Action.Replace:l&&!1===d?t.Action.Insert:!1===l?t.Action.Delete:t.Action.None)!=t.Action.None&&i.push(new t.Operation(c,e,o[a].StartInOld,n,o[a].StartInNew)),0!==o[a].Size&&i.push(new t.Operation(t.Action.Equal,o[a].StartInOld,o[a].EndInOld(),o[a].StartInNew,o[a].EndInNew())),e=o[a].EndInOld(),n=o[a].EndInNew()}return i},p=function(e){for(var n=[],i=null,s=null,o=0;o<e.length;o++)if(null!==s)if(i.EndInOld()==s.StartInOld&&i.EndInNew()==s.StartInNew||s.EndInOld()==e[o].StartInOld&&s.EndInNew()==e[o].StartInNew)n.push(new t.Match(s.StartInOld,s.StartInNew,s.Size)),i=s,s=e[o];else{var a=void 0,l=0;for(a=Math.min(i.EndInOld(),e[o].StartInOld-i.EndInOld());a<Math.max(i.EndInOld(),e[o].StartInOld-i.EndInOld());a++)l+=r._oldWords[a].length;var d=0;for(a=Math.min(i.EndInNew(),e[o].StartInNew-i.EndInNew());a<Math.max(i.EndInNew(),e[o].StartInNew-i.EndInNew());a++)d+=r._newWords[a].length;var c=0;for(a=Math.min(s.StartInNew,s.EndInNew()-s.StartInNew);a<Math.max(s.StartInNew,s.EndInNew()-s.StartInNew);a++)c+=r._newWords[a].length;c>Math.max(l,d)*r.OrphanMatchThreshold&&n.push(new t.Match(s.StartInOld,s.StartInNew,s.Size)),i=s,s=e[o]}else i=new t.Match(0,0,0),s=e[o];return n.push(new t.Match(s.StartInOld,s.StartInNew,s.Size)),n},f=function(){var t=[];return g(0,r._oldWords.length,0,r._newWords.length,t),t},g=function t(e,n,r,i,s){var o=I(e,n,r,i);null!==o&&(e<o.StartInOld&&r<o.StartInNew&&t(e,o.StartInOld,r,o.StartInNew,s),s.push(o),o.EndInOld()<n&&o.EndInNew()<i&&t(o.EndInOld(),n,o.EndInNew(),i,s))},I=function(e,n,i,s){for(var o=r._matchGranularity;o>0;o--){var a=new t.MatchOptions;a.BlockSize=o,a.RepeatingWordsAccuracy=r.RepeatingWordsAccuracy,a.IgnoreWhitespaceDifferences=r.IgnoreWhitespaceDifferences;var l=new t.MatchFinder(r._oldWords,r._newWords,e,n,i,s,a).FindMatch();if(null!==l)return l}return null}};r.Action={Equal:0,Delete:1,Insert:2,None:3,Replace:4},r.Mode={Character:0,Tag:1,Whitespace:2,Entity:3},r.Utils={OpeningTagRegex:new RegExp(/^\s*<[^>]+>\s*$/),ClosingTagTexRegex:new RegExp(/^\s*<\/[^>]+>\s*$/),TagWordRegex:new RegExp(/<[^\s>]+/),WhitespaceRegex:new RegExp(/^(\s|&nbsp;)+$/),WordRegex:new RegExp(/[\w#@]+/),SpecialCaseWordTags:["<img"],IsTag:function(t){for(var e=0;e<r.Utils.SpecialCaseWordTags.length;e++)if(null!==t&&t.startsWith(r.Utils.SpecialCaseWordTags[e]))return!1;return r.Utils.IsOpeningTag(t)||r.Utils.IsClosingTag(t)},IsOpeningTag:function(t){return r.Utils.OpeningTagRegex.test(t)},IsClosingTag:function(t){return r.Utils.ClosingTagTexRegex.test(t)},StripTagAttributes:function(t){var e=t.match(r.Utils.TagWordRegex);return t=(e.length>0?e[0]:"")+(t.endsWith("/>")?"/>":">")},WrapText:function(t,e,n){return"<"+e+' class="'+n+'">'+t+"</"+e+">"},IsStartOfTag:function(t){return"<"==t},IsEndOfTag:function(t){return">"==t},IsStartOfEntity:function(t){return"&"==t},IsEndOfEntity:function(t){return";"==t},IsWhiteSpace:function(t){return r.Utils.WhitespaceRegex.test(t)},StripAnyAttributes:function(t){return r.Utils.IsTag(t)?r.Utils.StripTagAttributes(t):t},IsWord:function(t){return r.Utils.WordRegex.test(t)}},r.WordSplitter={ConvertHtmlToListOfWords:function(t,e){for(var n=r.Mode.Character,i=[],s=[],o=r.WordSplitter.FindBlocks(t,e),a=o.length>0,l=!1,d=-1,c=0;c<t.length;c++){var h=t[c];if(a&&(d==c&&(d=-1,l=!1),o.hasOwnProperty(c)&&(l=!0,d=o[c]),l))i.push(h),n=r.Mode.Character;else switch(n){case r.Mode.Character:r.Utils.IsStartOfTag(h)?(0!==i.length&&s.push(i.join("")),(i=[]).push("<"),n=r.Mode.Tag):r.Utils.IsStartOfEntity(h)?(0!==i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Entity):r.Utils.IsWhiteSpace(h)?(0!==i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Whitespace):r.Utils.IsWord(h)&&(0===i.length||r.Utils.IsWord(i[i.length-1]))?i.push(h):(0!==i.length&&s.push(i.join("")),(i=[]).push(h));break;case r.Mode.Tag:r.Utils.IsEndOfTag(h)?(i.push(h),s.push(i.join("")),i=[],n=r.Utils.IsWhiteSpace(h)?r.Mode.Whitespace:r.Mode.Character):i.push(h);break;case r.Mode.Whitespace:r.Utils.IsStartOfTag(h)?(0!==i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Tag):r.Utils.IsStartOfEntity(h)?(0!==i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Entity):r.Utils.IsWhiteSpace(h)?i.push(h):(0!==i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Character);break;case r.Mode.Entity:if(r.Utils.IsStartOfTag(h))0!==i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Tag;else if(r.Utils.IsWhiteSpace(h))0!==i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Whitespace;else if(r.Utils.IsEndOfEntity(h)){var u=!0;if(0!=i.length&&(i.push(h),s.push(i.join("")),s.length>2&&r.Utils.IsWhiteSpace(s[s.length-2])&&r.Utils.IsWhiteSpace(s[s.length-1]))){var p=s[s.length-2],f=s[s.length-1];s.pop(),s.pop(),(i=[]).concat(p.split("")),i.concat(f.split("")),n=r.Mode.Whitespace,u=!1}u&&(i=[],n=r.Mode.Character)}else r.Utils.IsWord(h)?i.push(h):(0!=i.length&&s.push(i.join("")),(i=[]).push(h),n=r.Mode.Character)}}return 0!=i.length&&s.push(i.join("")),s},FindBlocks:function(t,e){var n={};if(null==e)return n;for(var r=0;r<e.length;r++)for(var i=t.match(e[r]),s=0,o=0;o<i.length;o++){var a=t.indexOf(i[o],s);n.Add(a,a+i[o].length),s=a+i[o].length}return n}},r.Match=function(t,e,n){this.StartInOld=t,this.StartInNew=e,this.Size=n,this.EndInOld=function(){return this.StartInOld+this.Size},this.EndInNew=function(){return this.StartInNew+this.Size}},r.Operation=function(t,e,n,r,i){this.Action=t,this.StartInOld=e,this.EndInOld=n,this.StartInNew=r,this.EndInNew=i},r.MatchOptions=function(){this.BlockSize=0,this.RepeatingWordsAccuracy=0,this.IgnoreWhitespaceDifferences=!1},r.MatchFinder=function(t,e,n,i,s,o,a){this._oldWords=t,this._newWords=e,this._startInOld=n,this._endInOld=i,this._startInNew=s,this._endInNew=o,this._wordIndices=null,this._options=a;var l=this;this.IndexNewWords=function(){l._wordIndices={};for(var t=[],e=l._startInNew;e<l._endInNew;e++){var n=l.NormalizeForIndex(l._newWords[e]),r=l.PutNewWord(t,n,l._options.BlockSize);null!=r&&(l._wordIndices.hasOwnProperty(r)?l._wordIndices[r].push(e):l._wordIndices[r]=[e])}},this.PutNewWord=function(t,e,n){if(t.push(e),t.length>n&&t.shift(),t.length!=n)return null;for(var r="",i=0;i<t.length;i++)r+=t[i];return r},this.NormalizeForIndex=function(t){return t=r.Utils.StripAnyAttributes(t),l._options.IgnoreWhitespaceDifferences&&r.Utils.IsWhiteSpace(t)?" ":t},this.FindMatch=function(){if(l.IndexNewWords(),l.RemoveRepeatingWords(),0==l._wordIndices.length)return null;for(var t=l._startInOld,e=l._startInNew,n=0,i={},s=[],o=l._startInOld;o<l._endInOld;o++){var a=l.NormalizeForIndex(l._oldWords[o]),d=l.PutNewWord(s,a,l._options.BlockSize);if(null!=d){var c={};if(l._wordIndices.hasOwnProperty(d)){for(var h=0;h<l._wordIndices[d].length;h++){var u=(i.hasOwnProperty(l._wordIndices[d][h]-1)?i[l._wordIndices[d][h]-1]:0)+1;c[l._wordIndices[d][h]]=u,u>n&&(t=o-u+1-l._options.BlockSize+1,e=l._wordIndices[d][h]-u+1-l._options.BlockSize+1,n=u)}i=c}else i=c}}return 0!=n?new r.Match(t,e,n+l._options.BlockSize-1):null},this.RemoveRepeatingWords=function(){var t=l._newWords.length*l._options.RepeatingWordsAccuracy,e=[];for(var n in l._wordIndices)l._wordIndices.hasOwnProperty(n)&&l._wordIndices[n].length>t&&e.push(n);for(var r=0;r<e.length;r++)delete l._wordIndices[e[r]]}},e.default=r,t.exports=e.default}])});