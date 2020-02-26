# PandaGainz

**Official website: https://pandagainz.com**

PandaGainz allows Bitpanda users to generate a small report based on their trades and current holdings. Users can then use this information as a helper to create their tax reports, or simply to keep track of their progress.

- Runs on Node.js, backend mostly TypeScript
- Dockerfile ready so you can build your own image
- Vanilla-bare-metal-no-frills Javascript + HTML5 + CSS3 frontend
- Reports can be generated on a use friendly table, or directly fetched as JSON
- Reports and API keys are not stored or shared with anyone, and will never be
- Calculations are done using the FIFO (first in first out) method

**Please note that this tool is pretty much still on beta!** I haven't tested all use cases yet, and so far it will only work with EUR transactions. If you find bugs, please [create an issue](https://github.com/igoramadas/pandagainz/issues/new).
