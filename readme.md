## Project Description

A library for comparing two HTML files/snippets and highlighting the differences using simple HTML.

This HTML Diff implementation is a vanilla JavaScript port of the C# port (found at https://github.com/Rohland/htmldiff.net) of the Ruby implementation (found at https://github.com/myobie/htmldiff)

See **[Demo](https://frattaro.github.io/htmldiff.js/)**

## Usage

```JavaScript
var htmlDiff = new HtmlDiff(oldHtml, newHtml);
var output = htmlDiff.Build();
```