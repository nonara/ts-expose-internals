const tsTagsModule = require('./src/ts-tags');


/* ****************************************************************************************************************** */
// region: Entry
/* ****************************************************************************************************************** */

const originalGetAllTsTags = tsTagsModule.getAllTsTags;
tsTagsModule.getAllTsTags = function () {
  const tags = originalGetAllTsTags.apply(this, arguments).reverse();
  for (const tag of tags) {
    if (tag.match(/^v\d+\.\d+\.\d+$/)) {
      return [ tag ];
    }
  }

  console.log(`Sending single tag: ${tags[0]}`);

  throw new Error('No valid tags found');
}

// endregion
