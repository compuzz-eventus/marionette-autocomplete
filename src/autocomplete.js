import { Collection } from './Collection.js';
import { CollectionView } from './CollectionView.js';
import { ChildView } from './ChildView.js';
import { Behavior } from './Behavior.js';

export { Collection, CollectionView, ChildView, Behavior };

// Facilité de migration
const AutoComplete = { Collection, CollectionView, ChildView, Behavior };
export default AutoComplete;
