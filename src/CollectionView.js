import _ from 'underscore';
import $ from 'jquery';
import Marionette from 'backbone.marionette';

export class CollectionView extends Marionette.CollectionView {
  tagName() { return 'div'; }
  childViewContainer = 'ul';
  className() { return 'ac-suggestions dropdown-menu'; }
  attributes() { return { style: 'width: 100%;' }; }

  template = _.template('<ul></ul>');

  emptyView = Marionette.View.extend({
    tagName: 'li',
    template: _.template('<span>No suggestions available</span>'),
  });

  initialize() { this.loading = false; }

  collectionEvents() {
    return { sync: 'endLoading', request: 'startLoading', 'all:loaded': 'onAllLoaded' };
  }

  onScroll(event) {
    if (!this.loading) {
      const lastFith = event.currentTarget.querySelector('li:nth-last-child(5)');
      if (!lastFith) return;
      const rect = lastFith.getBoundingClientRect();
      const ulRect = event.currentTarget.getBoundingClientRect();
      if (rect.top >= ulRect.top && rect.bottom <= ulRect.bottom) {
        this.collection.trigger('load:more');
        this.loading = true;
      }
    }
  }

  onRender() {
    this.$el.find('ul').on('scroll', (e) => this.onScroll(e));
  }

  onAllLoaded() {
    this.collection.each((model) => {
      if (model.get(this.options.collection.options.valueKey) === this.options.collection.query) {
        this.$el.parent().parent().find('.js-edit-record').attr('title', model.get('name') ? model.get('name') : '');
        this.$el.parent().attr('title', model.get('name') ? model.get('name') : '');
      }
    });
  }

  endLoading() { this.loading = false; }
  startLoading() { this.loading = true; }
}

export default CollectionView;
