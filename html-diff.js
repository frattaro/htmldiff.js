'use strict';

/*

Manually translated to JS from C#.
Original: https://github.com/Rohland/htmldiff.net
Original was actually a .net port of a Ruby implementation: https://github.com/myobie/htmldiff
There also looks to be other implementations in CoffeeScript, as well as an Angular module.

*/

function HtmlDiff(oldText, newText) {
    /// <summary>
    /// This value defines balance between speed and memory utilization. The higher it is the faster it works and more memory consumes.
    /// </summary>
    this.MatchGranularityMaximum = 4;

    this._content = [];
    this._newText = newText;
    this._oldText = oldText;
    var that = this;

    this._specialCaseClosingTags = {
        '</strong>': 0,
        '</em>': 0,
        '</b>': 0,
        '</i>': 0,
        '</big>': 0,
        '</small>': 0,
        '</u>': 0,
        '</sub>': 0,
        '</sup>': 0,
        '</strike>': 0,
        '</s>': 0
    };

    this._specialCaseOpeningTagRegex = new RegExp(/<((strong)|(b)|(i)|(em)|(big)|(small)|(u)|(sub)|(sup)|(strike)|(s))[\>\s]+/i);

    this._specialTagDiffStack = [];

    this._newWords;
    this._oldWords;
    this._matchGranularity;
    this._blockExpressions = [];

    /// <summary>
    /// Defines how to compare repeating words. Valid values are from 0 to 1.
    /// This value allows to exclude some words from comparison that eventually
    /// reduces the total time of the diff algorithm.
    /// 0 means that all words are excluded so the diff will not find any matching words at all.
    /// 1 (default value) means that all words participate in comparison so this is the most accurate case.
    /// 0.5 means that any word that occurs more than 50% times may be excluded from comparison. This doesn't
    /// mean that such words will definitely be excluded but only gives a permission to exclude them if necessary.
    /// </summary>
    this.RepeatingWordsAccuracy = 1;

    /// <summary>
    /// If true all whitespaces are considered as equal
    /// </summary>
    this.IgnoreWhitespaceDifferences = false;

    /// <summary>
    /// If some match is too small and located far from its neighbors then it is considered as orphan
    /// and removed. For example:
    /// <code>
    /// aaaaa bb ccccccccc dddddd ee
    /// 11111 bb 222222222 dddddd ee
    /// </code>
    /// will find two matches <code>bb</code> and <code>dddddd ee</code> but the first will be considered
    /// as orphan and ignored, as result it will consider texts <code>aaaaa bb ccccccccc</code> and
    /// <code>11111 bb 222222222</code> as single replacement:
    /// <code>
    /// &lt;del&gt;aaaaa bb ccccccccc&lt;/del&gt;&lt;ins&gt;11111 bb 222222222&lt;/ins&gt; dddddd ee
    /// </code>
    /// This property defines relative size of the match to be considered as orphan, from 0 to 1.
    /// 1 means that all matches will be considered as orphans.
    /// 0 (default) means that no match will be considered as orphan.
    /// 0.2 means that if match length is less than 20% of distance between its neighbors it is considered as orphan.
    /// </summary>
    this.OrphanMatchThreshold = 0;

    /// <summary>
    /// Builds the HTML diff output
    /// </summary>
    /// <returns>HTML diff markup</returns>
    this.Build = function () {
        // If there is no difference, don't bother checking for differences
        if (that._oldText == that._newText) {
            return that._newText;
        }

        SplitInputsToWords();

        that._matchGranularity = Math.min(that.MatchGranularityMaximum, Math.min(that._oldWords.length, that._newWords.length));

        let operations = Operations();

        for (let i = 0; i < operations.length; i++) {
            PerformOperation(operations[i]);
        }

        return that._content.join('');
    };

    /// <summary>
    /// Uses <paramref name="expression"/> to group text together so that any change detected within the group is treated as a single block
    /// </summary>
    /// <param name="expression"></param>
    this.AddBlockExpression = function (expression) {
        that._blockExpressions.push(expression);
    };

    var SplitInputsToWords = function () {
        that._oldWords = HtmlDiff.WordSplitter.ConvertHtmlToListOfWords(that._oldText, that._blockExpressions);
        that._oldText = null;

        that._newWords = HtmlDiff.WordSplitter.ConvertHtmlToListOfWords(that._newText, that._blockExpressions);
        that._newText = null;
    };

    var PerformOperation = function (operation) {
        switch (operation.Action) {
            case HtmlDiff.Action.Equal:
                ProcessEqualOperation(operation);
                break;
            case HtmlDiff.Action.Delete:
                ProcessDeleteOperation(operation, 'diffdel');
                break;
            case HtmlDiff.Action.Insert:
                ProcessInsertOperation(operation, 'diffins');
                break;
            case HtmlDiff.Action.None:
                break;
            case HtmlDiff.Action.Replace:
                ProcessReplaceOperation(operation);
                break;
        }
    };

    var ProcessReplaceOperation = function (operation) {
        ProcessDeleteOperation(operation, 'diffmod');
        ProcessInsertOperation(operation, 'diffmod');
    };

    var ProcessInsertOperation = function (operation, cssClass) {
        InsertTag('ins', cssClass, that._newWords.slice(operation.StartInNew, operation.EndInNew));
    };

    var ProcessDeleteOperation = function (operation, cssClass) {
        InsertTag('del', cssClass, that._oldWords.slice(operation.StartInOld, operation.EndInOld));
    };

    var ProcessEqualOperation = function (operation) {
        that._content.push(that._newWords.slice(operation.StartInNew, operation.EndInNew).join(''));
    };

    /// <summary>
    ///     This method encloses words within a specified tag (ins or del), and adds this into "content",
    ///     with a twist: if there are words contain tags, it actually creates multiple ins or del,
    ///     so that they don't include any ins or del. This handles cases like
    ///     old: '<p>a</p>'
    ///     new: '<p>ab</p>
    ///     <p>
    ///         c</b>'
    ///         diff result: '<p>a<ins>b</ins></p>
    ///         <p>
    ///             <ins>c</ins>
    ///         </p>
    ///         '
    ///         this still doesn't guarantee valid HTML (hint: think about diffing a text containing ins or
    ///         del tags), but handles correctly more cases than the earlier version.
    ///         P.S.: Spare a thought for people who write HTML browsers. They live in this ... every day.
    /// </summary>
    /// <param name="tag"></param>
    /// <param name="cssClass"></param>
    /// <param name="words"></param>
    var InsertTag = function (tag, cssClass, words) {
        while (true) {
            if (words.length === 0) {
                break;
            }

            let nonTags = ExtractConsecutiveWords(words, function (x) { return !HtmlDiff.Utils.IsTag(x); });

            let specialCaseTagInjection = '';
            let specialCaseTagInjectionIsBefore = false;

            if (nonTags.length !== 0) {
                let text = HtmlDiff.Utils.WrapText(nonTags.join(''), tag, cssClass);
                that._content.push(text);
            }
            else {
                // Check if the tag is a special case
                if (that._specialCaseOpeningTagRegex.test(words[0])) {
                    that._specialTagDiffStack.push(words[0]);
                    specialCaseTagInjection = '<ins class="mod">';
                    if (tag == 'del') {
                        words.shift();

                        // following tags may be formatting tags as well, follow through
                        while (words.length > 0 && that._specialCaseOpeningTagRegex.test(words[0])) {
                            words.shift();
                        }
                    }
                }
                else if (that._specialCaseClosingTags.hasOwnProperty(words[0].toLowerCase())) {
                    var openingTag = that._specialTagDiffStack.length === 0 ? null : that._specialTagDiffStack.pop();

                    // If we didn't have an opening tag, and we don't have a match with the previous tag used 
                    if (openingTag === null || openingTag != words[words.length - 1].replace('/', '')) {
                        // do nothing
                    }
                    else {
                        specialCaseTagInjection = '</ins>';
                        specialCaseTagInjectionIsBefore = true;
                    }

                    if (tag == 'del') {
                        words.shift();

                        // following tags may be formatting tags as well, follow through
                        while (words.length > 0 && that._specialCaseClosingTags.hasOwnProperty(words[0].toLowerCase())) {
                            words.shift();
                        }
                    }
                }
            }

            if (words.length === 0 && specialCaseTagInjection.length === 0) {
                break;
            }

            if (specialCaseTagInjectionIsBefore) {
                that._content.push(specialCaseTagInjection + ExtractConsecutiveWords(words, HtmlDiff.Utils.IsTag).join(''));
            }
            else {
                that._content.push(ExtractConsecutiveWords(words, HtmlDiff.Utils.IsTag).join('') + specialCaseTagInjection);
            }
        }
    };

    var ExtractConsecutiveWords = function (words, condition) {
        let indexOfFirstTag = null;

        for (let i = 0; i < words.length; i++) {
            let word = words[i];

            if (i === 0 && word == ' ') {
                words[i] = '&nbsp;';
            }

            if (!condition(word)) {
                indexOfFirstTag = i;
                break;
            }
        }

        let items;
        if (indexOfFirstTag !== null) {
            items = words.slice(0, indexOfFirstTag);
            if (indexOfFirstTag > 0) {
                words.splice(0, indexOfFirstTag);
            }
        }
        else {
            items = words.slice();
            words.splice(0);
        }

        return items;
    };

    var Operations = function () {
        let positionInOld = 0, positionInNew = 0;
        let operations = [];

        var matches = MatchingBlocks();

        matches.push(new HtmlDiff.Match(that._oldWords.length, that._newWords.length, 0));

        //Remove orphans from matches.
        //If distance between left and right matches is 4 times longer than length of current match then it is considered as orphan
        var mathesWithoutOrphans = RemoveOrphans(matches);

        for (let i = 0; i < mathesWithoutOrphans.length; i++) {
            let matchStartsAtCurrentPositionInOld = positionInOld == mathesWithoutOrphans[i].StartInOld;
            let matchStartsAtCurrentPositionInNew = positionInNew == mathesWithoutOrphans[i].StartInNew;

            let action = null;

            if (matchStartsAtCurrentPositionInOld === false && matchStartsAtCurrentPositionInNew === false) {
                action = HtmlDiff.Action.Replace;
            }
            else if (matchStartsAtCurrentPositionInOld
                        && matchStartsAtCurrentPositionInNew === false) {
                action = HtmlDiff.Action.Insert;
            }
            else if (matchStartsAtCurrentPositionInOld === false) {
                action = HtmlDiff.Action.Delete;
            }
            else // This occurs if the first few words are the same in both versions
            {
                action = HtmlDiff.Action.None;
            }

            if (action != HtmlDiff.Action.None) {
                operations.push(
                    new HtmlDiff.Operation(action,
                        positionInOld,
                        mathesWithoutOrphans[i].StartInOld,
                        positionInNew,
                        mathesWithoutOrphans[i].StartInNew));
            }

            if (mathesWithoutOrphans[i].Size !== 0) {
                operations.push(new HtmlDiff.Operation(
                    HtmlDiff.Action.Equal,
                    mathesWithoutOrphans[i].StartInOld,
                    mathesWithoutOrphans[i].EndInOld(),
                    mathesWithoutOrphans[i].StartInNew,
                    mathesWithoutOrphans[i].EndInNew()));
            }

            positionInOld = mathesWithoutOrphans[i].EndInOld();
            positionInNew = mathesWithoutOrphans[i].EndInNew();
        }

        return operations;
    };

    var RemoveOrphans = function (matches) {
        let matchesNoOrphans = [];
        let prev = null;
        let curr = null;
        for (let i = 0; i < matches.length; i++) {
            if (curr === null) {
                prev = new HtmlDiff.Match(0, 0, 0);
                curr = matches[i];
                continue;
            }

            //if match has no diff on the left or on the right
            if (prev.EndInOld() == curr.StartInOld && prev.EndInNew() == curr.StartInNew || curr.EndInOld() == matches[i].StartInOld && curr.EndInNew() == matches[i].StartInNew) {
                matchesNoOrphans.push(new HtmlDiff.Match(curr.StartInOld, curr.StartInNew, curr.Size));
                prev = curr;
                curr = matches[i];
                continue;
            }

            let j;
            var oldDistanceInChars = 0;
            for (j = Math.min(prev.EndInOld(), matches[i].StartInOld - prev.EndInOld()); j < Math.max(prev.EndInOld(), matches[i].StartInOld - prev.EndInOld()); j++) {
                oldDistanceInChars += that._oldWords[j].length;
            }

            var newDistanceInChars = 0;
            for (j = Math.min(prev.EndInNew(), matches[i].StartInNew - prev.EndInNew()); j < Math.max(prev.EndInNew(), matches[i].StartInNew - prev.EndInNew()); j++) {
                newDistanceInChars += that._newWords[j].length;
            }

            var currMatchLengthInChars = 0;
            for (j = Math.min(curr.StartInNew, curr.EndInNew() - curr.StartInNew); j < Math.max(curr.StartInNew, curr.EndInNew() - curr.StartInNew); j++) {
                currMatchLengthInChars += that._newWords[j].length;
            }

            if (currMatchLengthInChars > Math.max(oldDistanceInChars, newDistanceInChars) * that.OrphanMatchThreshold) {
                matchesNoOrphans.push(new HtmlDiff.Match(curr.StartInOld, curr.StartInNew, curr.Size));
            }

            prev = curr;
            curr = matches[i];
        }

        matchesNoOrphans.push(new HtmlDiff.Match(curr.StartInOld, curr.StartInNew, curr.Size));
        return matchesNoOrphans;
    };

    var MatchingBlocks = function () {
        var matchingBlocks = [];
        FindMatchingBlocks(0, that._oldWords.length, 0, that._newWords.length, matchingBlocks);
        return matchingBlocks;
    };

    var FindMatchingBlocks = function (startInOld, endInOld, startInNew, endInNew, matchingBlocks) {
        let match = FindMatch(startInOld, endInOld, startInNew, endInNew);

        if (match !== null) {
            if (startInOld < match.StartInOld && startInNew < match.StartInNew) {
                FindMatchingBlocks(startInOld, match.StartInOld, startInNew, match.StartInNew, matchingBlocks);
            }

            matchingBlocks.push(match);

            if (match.EndInOld() < endInOld && match.EndInNew() < endInNew) {
                FindMatchingBlocks(match.EndInOld(), endInOld, match.EndInNew(), endInNew, matchingBlocks);
            }
        }
    };

    var FindMatch = function (startInOld, endInOld, startInNew, endInNew) {
        // For large texts it is more likely that there is a Match of size bigger than maximum granularity.
        // If not then go down and try to find it with smaller granularity.
        for (let i = that._matchGranularity; i > 0; i--) {
            let options = new HtmlDiff.MatchOptions();
            options.BlockSize = i;
            options.RepeatingWordsAccuracy = that.RepeatingWordsAccuracy;
            options.IgnoreWhitespaceDifferences = that.IgnoreWhitespaceDifferences;

            let finder = new HtmlDiff.MatchFinder(that._oldWords, that._newWords, startInOld, endInOld, startInNew, endInNew, options);
            let match = finder.FindMatch();
            if (match !== null) {
                return match;
            }
        }

        return null;
    };
}

/* STATIC OBJECTS */

HtmlDiff.Action = {
    Equal: 0,
    Delete: 1,
    Insert: 2,
    None: 3,
    Replace: 4
};

HtmlDiff.Mode = {
    Character: 0,
    Tag: 1,
    Whitespace: 2,
    Entity: 3
};

HtmlDiff.Utils = {
    OpeningTagRegex: new RegExp(/^\s*<[^>]+>\s*$/),
    ClosingTagTexRegex: new RegExp(/^\s*<\/[^>]+>\s*$/),
    TagWordRegex: new RegExp(/<[^\s>]+/),
    WhitespaceRegex: new RegExp(/^(\s|&nbsp;)+$/),
    WordRegex: new RegExp(/[\w\#@]+/),
    SpecialCaseWordTags: ['<img'],
    IsTag: function (item) {
        for (let i = 0; i < HtmlDiff.Utils.SpecialCaseWordTags.length; i++) {
            if (item !== null && item.startsWith(HtmlDiff.Utils.SpecialCaseWordTags[i])) {
                return false;
            }
        }

        return HtmlDiff.Utils.IsOpeningTag(item) || HtmlDiff.Utils.IsClosingTag(item);
    },
    IsOpeningTag: function (item) {
        return HtmlDiff.Utils.OpeningTagRegex.test(item);
    },
    IsClosingTag: function (item) {
        return HtmlDiff.Utils.ClosingTagTexRegex.test(item);
    },
    StripTagAttributes: function (word) {
        let matches = word.match(HtmlDiff.Utils.TagWordRegex);
        let tag = matches.length > 0 ? matches[0] : '';
        word = tag + (word.endsWith('/>') ? '/>' : '>');
        return word;
    },
    WrapText: function (text, tagName, cssClass) {
        return '<' + tagName + ' class="' + cssClass + '">' + text + '</' + tagName + '>';
    },
    IsStartOfTag: function (val) {
        return val == '<';
    },
    IsEndOfTag: function (val) {
        return val == '>';
    },
    IsStartOfEntity: function (val) {
        return val == '&';
    },
    IsEndOfEntity: function (val) {
        return val == ';';
    },
    IsWhiteSpace: function (value) {
        return HtmlDiff.Utils.WhitespaceRegex.test(value);
    },
    StripAnyAttributes: function (word) {
        if (HtmlDiff.Utils.IsTag(word)) {
            return HtmlDiff.Utils.StripTagAttributes(word);
        }

        return word;
    },
    IsWord: function (text) {
        return HtmlDiff.Utils.WordRegex.test(text);
    }
};

HtmlDiff.WordSplitter = {
    ConvertHtmlToListOfWords: function (text, blockExpressions) {
        let mode = HtmlDiff.Mode.Character;
        let currentWord = []; // new List<char>();
        let words = []; // new List<string>();

        let blockLocations = HtmlDiff.WordSplitter.FindBlocks(text, blockExpressions);

        let isBlockCheckRequired = blockLocations.length > 0;
        let isGrouping = false;
        let groupingUntil = -1;

        for (let index = 0; index < text.length; index++) {
            let character = text[index];

            // Don't bother executing block checks if we don't have any blocks to check for!
            if (isBlockCheckRequired) {
                // Check if we have completed grouping a text sequence/block
                if (groupingUntil == index) {
                    groupingUntil = -1;
                    isGrouping = false;
                }

                // Check if we need to group the next text sequence/block
                if (blockLocations.hasOwnProperty(index)) {
                    isGrouping = true;
                    groupingUntil = blockLocations[index];
                }

                // if we are grouping, then we don't care about what type of character we have, it's going to be treated as a word
                if (isGrouping) {
                    currentWord.push(character);
                    mode = HtmlDiff.Mode.Character;
                    continue;
                }
            }

            switch (mode) {
                case HtmlDiff.Mode.Character:

                    if (HtmlDiff.Utils.IsStartOfTag(character)) {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }

                        currentWord = [];
                        currentWord.push('<');
                        mode = HtmlDiff.Mode.Tag;
                    }
                    else if (HtmlDiff.Utils.IsStartOfEntity(character)) {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }

                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Entity;
                    }
                    else if (HtmlDiff.Utils.IsWhiteSpace(character)) {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }

                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Whitespace;
                    }
                    else if (HtmlDiff.Utils.IsWord(character)
                        && (currentWord.length === 0 || HtmlDiff.Utils.IsWord(currentWord[currentWord.length - 1]))) {
                        currentWord.push(character);
                    }
                    else {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }
                        currentWord = [];
                        currentWord.push(character);
                    }

                    break;
                case HtmlDiff.Mode.Tag:

                    if (HtmlDiff.Utils.IsEndOfTag(character)) {
                        currentWord.push(character);
                        words.push(currentWord.join(''));
                        currentWord = [];

                        mode = HtmlDiff.Utils.IsWhiteSpace(character) ? HtmlDiff.Mode.Whitespace : HtmlDiff.Mode.Character;
                    }
                    else {
                        currentWord.push(character);
                    }

                    break;
                case HtmlDiff.Mode.Whitespace:

                    if (HtmlDiff.Utils.IsStartOfTag(character)) {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }
                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Tag;
                    }
                    else if (HtmlDiff.Utils.IsStartOfEntity(character)) {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }

                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Entity;
                    }
                    else if (HtmlDiff.Utils.IsWhiteSpace(character)) {
                        currentWord.push(character);
                    }
                    else {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }

                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Character;
                    }

                    break;
                case HtmlDiff.Mode.Entity:
                    if (HtmlDiff.Utils.IsStartOfTag(character)) {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }

                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Tag;
                    }
                    else if (HtmlDiff.Utils.IsWhiteSpace(character)) {
                        if (currentWord.length !== 0) {
                            words.push(currentWord.join(''));
                        }
                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Whitespace;
                    }
                    else if (HtmlDiff.Utils.IsEndOfEntity(character)) {
                        let switchToNextMode = true;
                        if (currentWord.length != 0) {
                            currentWord.push(character);
                            words.push(currentWord.join(''));

                            //join &nbsp; entity with last whitespace
                            if (words.length > 2 && HtmlDiff.Utils.IsWhiteSpace(words[words.length - 2]) && HtmlDiff.Utils.IsWhiteSpace(words[words.length - 1])) {
                                var w1 = words[words.length - 2];
                                var w2 = words[words.length - 1];

                                words.pop();
                                words.pop();
                                currentWord = [];

                                currentWord.concat(w1.split(''));
                                currentWord.concat(w2.split(''));
                                mode = HtmlDiff.Mode.Whitespace;
                                switchToNextMode = false;
                            }
                        }

                        if (switchToNextMode) {
                            currentWord = [];
                            mode = HtmlDiff.Mode.Character;
                        }
                    }
                    else if (HtmlDiff.Utils.IsWord(character)) {
                        currentWord.push(character);
                    }
                    else {
                        if (currentWord.length != 0) {
                            words.push(currentWord.join(''));
                        }

                        currentWord = [];
                        currentWord.push(character);
                        mode = HtmlDiff.Mode.Character;
                    }
                    break;
            }
        }
        if (currentWord.length != 0) {
            words.push(currentWord.join(''));
        }

        return words;
    },
    FindBlocks: function (text, blockExpressions) {
        let blockLocations = {}; // new Dictionary<int, int>();

        if (blockExpressions == null) {
            return blockLocations;
        }

        for (let i = 0; i < blockExpressions.length; i++) {
            let matches = text.match(blockExpressions[i]);
            let matchEnd = 0;
            for (let j = 0; j < matches.length; j++) {
                let index = text.indexOf(matches[j], matchEnd);
                blockLocations.Add(index, index + matches[j].length);
                matchEnd = index + matches[j].length;
            }
        }

        return blockLocations;
    }
};

/* INSTANTIATED OBJECTS */

HtmlDiff.Match = function (startInOld, startInNew, size) {
    this.StartInOld = startInOld;
    this.StartInNew = startInNew;
    this.Size = size;
    this.EndInOld = function () {
        return this.StartInOld + this.Size;
    };
    this.EndInNew = function () {
        return this.StartInNew + this.Size;
    };
};

HtmlDiff.Operation = function (action, startInOld, endInOld, startInNew, endInNew) {
    this.Action = action;
    this.StartInOld = startInOld;
    this.EndInOld = endInOld;
    this.StartInNew = startInNew;
    this.EndInNew = endInNew;
};

HtmlDiff.MatchOptions = function () {
    this.BlockSize = 0;
    this.RepeatingWordsAccuracy = 0;
    this.IgnoreWhitespaceDifferences = false;
};

HtmlDiff.MatchFinder = function (oldWords, newWords, startInOld, endInOld, startInNew, endInNew, options) {
    this._oldWords = oldWords;
    this._newWords = newWords;
    this._startInOld = startInOld;
    this._endInOld = endInOld;
    this._startInNew = startInNew;
    this._endInNew = endInNew;
    this._wordIndices = null;
    this._options = options;
    var that = this;

    this.IndexNewWords = function () {
        that._wordIndices = {}; // new Dictionary<string, List<int>>();
        let block = []; // new Queue<string>(_options.BlockSize);
        for (let i = that._startInNew; i < that._endInNew; i++) {

            // if word is a tag, we should ignore attributes as attribute changes are not supported (yet)
            let word = that.NormalizeForIndex(that._newWords[i]);
            let key = that.PutNewWord(block, word, that._options.BlockSize);

            if (key == null) {
                continue;
            }

            if (that._wordIndices.hasOwnProperty(key)) {
                that._wordIndices[key].push(i);
            }
            else {
                that._wordIndices[key] = [i];
            }
        }
    };

    this.PutNewWord = function (block, word, blockSize) {
        block.push(word);
        if (block.length > blockSize) {
            block.shift();
        }

        if (block.length != blockSize) {
            return null;
        }

        var result = '';
        for (let i = 0; i < block.length; i++) {
            result += block[i];
        }

        return result;
    };

    this.NormalizeForIndex = function (word) {
        word = HtmlDiff.Utils.StripAnyAttributes(word);
        if (that._options.IgnoreWhitespaceDifferences && HtmlDiff.Utils.IsWhiteSpace(word)) {
            return ' ';
        }

        return word;
    };

    this.FindMatch = function () {
        that.IndexNewWords();
        that.RemoveRepeatingWords();

        if (that._wordIndices.length == 0) {
            return null;
        }

        let bestMatchInOld = that._startInOld;
        let bestMatchInNew = that._startInNew;
        let bestMatchSize = 0;

        var matchLengthAt = {}; //new Dictionary<int, int>();
        var block = []; //new Queue<string>(_options.BlockSize);

        for (let indexInOld = that._startInOld; indexInOld < that._endInOld; indexInOld++) {
            var word = that.NormalizeForIndex(that._oldWords[indexInOld]);
            var index = that.PutNewWord(block, word, that._options.BlockSize);

            if (index == null) {
                continue;
            }

            var newMatchLengthAt = {}; //new Dictionary<int, int>();

            if (!that._wordIndices.hasOwnProperty(index)) {
                matchLengthAt = newMatchLengthAt;
                continue;
            }

            for (let i = 0; i < that._wordIndices[index].length; i++) {
                let newMatchLength = (matchLengthAt.hasOwnProperty(that._wordIndices[index][i] - 1) ? matchLengthAt[that._wordIndices[index][i] - 1] : 0) + 1;
                newMatchLengthAt[that._wordIndices[index][i]] = newMatchLength;

                if (newMatchLength > bestMatchSize) {
                    bestMatchInOld = indexInOld - newMatchLength + 1 - that._options.BlockSize + 1;
                    bestMatchInNew = that._wordIndices[index][i] - newMatchLength + 1 - that._options.BlockSize + 1;
                    bestMatchSize = newMatchLength;
                }
            }

            matchLengthAt = newMatchLengthAt;
        }

        return bestMatchSize != 0 ? new HtmlDiff.Match(bestMatchInOld, bestMatchInNew, bestMatchSize + that._options.BlockSize - 1) : null;
    };

    this.RemoveRepeatingWords = function () {
        var threshold = that._newWords.length * that._options.RepeatingWordsAccuracy;
        var repeatingWords = [];
        for (let w in that._wordIndices) {
            if (!that._wordIndices.hasOwnProperty(w)) {
                continue;
            }

            if (that._wordIndices[w].length > threshold) {
                repeatingWords.push(w);
            }
        }

        for (let i = 0; i < repeatingWords.length; i++) {
            delete that._wordIndices[repeatingWords[i]];
        }
    };
};