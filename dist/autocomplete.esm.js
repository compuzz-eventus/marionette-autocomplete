import _ from 'underscore';
import $ from 'jquery';
import Backbone from 'backbone';
import Marionette from 'backbone.marionette';

class Collection extends Backbone.Collection {
  initialize(models, options = {}) {
    this.options = options;
    this.setDataset(this.options.data);
    this._startListening();
    this.loading = false;
  }

  _startListening() {
    this.listenTo(this, 'find', this.fetchNewSuggestions);
    this.listenTo(this, 'select', this.select);
    this.listenTo(this, 'highlight:next', this.highlightNext);
    this.listenTo(this, 'highlight:previous', this.highlightPrevious);
    this.listenTo(this, 'clear', this.reset);
    this.listenTo(this, 'load:more', this.loadMore);
  }

  setDataset(dataset) {
    this.dataset = this.parse(dataset, false);
  }

  parse(suggestions = [], limit) {
    if (!suggestions) return [];
    if (this.options.parseKey) {
      suggestions = this.getValue(suggestions, this.options.parseKey);
    }
    if (limit) {
      suggestions = _.take(suggestions, this.options.values.limit);
    }
    return _.map(suggestions, (suggestion) => _.extend(suggestion, { value: this.getValue(suggestion, this.options.valueKey) }));
  }

  getValue(obj, prop) {
    if (!obj || !prop) return undefined;
    return _.reduce(prop.split('.'), (segment, property) => segment && segment[property], obj);
  }

  fetchNewSuggestions = (query) => {
    this.trigger('open');
    this.reset([]);
    switch (this.options.type) {
      case 'remote': {
        const method = this.options.method || 'GET';
        const contentType = method === 'POST' ? 'application/x-www-form-urlencoded' : 'application/json';
        const params = this.getParams(query);
        return this.fetch(Object.assign({
          url: this.options.remote,
          reset: true,
          type: method,
          contentType
        }, params));
      }
      case 'dataset':
        return this.filterDataSet(query);
      default:
        throw new Error('Unkown type passed');
    }
  };

  filterDataSet(query) {
    const matches = [];
    this.index = -1;
    _.each(this.dataset, (suggestion) => {
      if (matches.length >= this.options.values.limit) return false;
      if (this.matches(suggestion.value, query)) matches.push(suggestion);
    });
    this.set(matches);
  }

  matches(suggestion, query) {
    suggestion = this.normalizeValue(suggestion);
    query = this.normalizeValue(query);
    return suggestion.indexOf(query) >= 0;
  }

  normalizeValue(string = '') {
    return String(string).toLowerCase().replace(/^\s*/g, '').replace(/\s{2,}/g, ' ');
  }

  select = () => {
    if (this.isStarted()) return;
    this.trigger('selected', this.at(this.index));
  };

  highlightPrevious = () => {
    if (!(this.isFirst() || !this.isStarted())) {
      this.removeHighlight(this.index);
      this.highlight(this.index = this.index - 1);
    }
  };

  highlightNext = () => {
    if (this.options.lazyLoad && this.is5thFromLast() && !this.loading && !this.allLoaded) {
      this.loadMore();
    }
    if (!this.isLast()) {
      if (this.isStarted()) this.removeHighlight(this.index);
      this.highlight(this.index = this.index + 1);
    }
  };

  isFirst() { return this.index === 0; }
  isLast() { return this.index + 1 === this.length; }
  is5thFromLast() { return this.index + 1 === this.length - 5; }
  isStarted() { return this.index !== -1; }

  highlight(index) {
    const model = this.at(index);
    if (model) model.trigger('highlight', model);
    return model;
  }

  removeHighlight(index) {
    const model = this.at(index);
    if (model) model.trigger('highlight:remove', model);
    return model;
  }

  reset(models = [], options) {
    this.index = -1;
    this.allLoaded = false;
    if (models && models.rows) models = models.rows;
    const length = _.filter(models, (model) => !model.autocompleteAdd).length;
    if (length < this.options.values.limit) this.allLoaded = true;
    return super.reset(models, options);
  }

  loadMore = () => {
    if (this.loading || this.allLoaded) return;
    this.loading = true;
    const url = this.options.remote;
    const params = $.param(this.getParams(this.currentQuery).data);

    if (this.options.method === 'POST') {
      $.ajax({
        url,
        type: 'POST',
        data: params,
        contentType: 'application/x-www-form-urlencoded',
        success: (resp) => {
          this.parse(resp.rows);
          this.push(resp.rows);
          this.loading = false;
          this.trigger('sync');
          if (this.length === resp.records) {
            this.allLoaded = true;
            this.trigger('all:loaded');
          }
        }
      });
    } else {
      $.ajax({
        url: `${url}&${params}`,
        success: (resp) => {
          this.parse(resp.rows);
          this.push(resp.rows);
          this.loading = false;
          this.trigger('sync');
          if (this.length === resp.records) {
            this.allLoaded = true;
            this.trigger('all:loaded');
          }
        }
      });
    }
  };

  getParams(query) {
    this.currentQuery = query;
    const data = {};
    data[this.options.keys.query] = query;
    _.each(this.options.keys, (value, key) => {
      if (data[value] == null) data[value] = this.options.values[key];
    });
    data.first = this.length;
    return { data };
  }
}

class CollectionView extends Marionette.CollectionView {
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

class ChildView extends Marionette.View {
  tagName() { return 'li'; }

  className() { return 'ac-suggestion'; }

  template = _.template('<a href="#"><%= value %></a>');

  events() {
    return { click: 'select' };
  }

  modelEvents() {
    return { highlight: 'highlight', 'highlight:remove': 'removeHighlight' };
  }

  highlight() {
    this.$el.addClass('active');
  }

  removeHighlight() {
    this.$el.removeClass('active');
  }

  select(e) {
    e.preventDefault();
    e.stopPropagation();
    this.model.trigger('selected', this.model);
  }
}

class Behavior extends Marionette.Behavior {
  defaults() {
    return {
      rateLimit: 0,
      minLength: 0,
      collection: {
        class: Collection,
        options: {
          type: 'remote',
          remote: null,
          data: [],
          parseKey: null,
          valueKey: 'value',
          keys: { query: 'query', limit: 'limit' },
          values: { query: null, limit: 20 },
        },
      },
      collectionView: { class: CollectionView },
      childView: { class: ChildView },
    };
  }

  eventPrefix = 'autocomplete';
  actionKeysMap = { 27: 'esc', 13: 'enter', 38: 'up', 40: 'down' };

  events() {
    return {
      'keydown @ui.autocomplete': 'onKeyDown',
      'keyup @ui.autocomplete': 'onKeyUp',
      'click @ui.autocomplete': '_stopPropagationWhenVisible',
      'shown.bs.dropdown': 'setDropdownShown',
      'hidden.bs.dropdown': 'setDropdownHidden',
      'focusout @ui.autocomplete': 'focusOutInput',
    };
  }

  initialize(options) {
    this.visible = false;
    // deep merge like $.extend(true, ...)
    this.options = $.extend(true, {}, this.defaults(), options);
    this.suggestions = new this.options.collection.class([], this.options.collection.options);
    this.updateQuery = _.throttle(this._updateQuery.bind(this), this.options.rateLimit);
    this._startListening();
  }

  _startListening() {
    this.listenTo(this.suggestions, 'selected', this.completeQuery);
    this.listenTo(this.suggestions, 'highlight', this.fillQuery);
    this.listenTo(this.suggestions, 'open', this.openDropdown);
    this.listenTo(this.view, `${this.eventPrefix}:find`, this.findRelatedSuggestions);
  }

  onRender() {
    this._setInputAttributes();
    this._buildElement();
  }

  _buildElement() {
    this.container = $('<div class="ac-container dropdown"></div>');
    this.collectionView = this.getCollectionView();
    this.ui.autocomplete.replaceWith(this.container);
    this.container.append(this.ui.autocomplete).append(this.collectionView.render().el);
  }

  getCollectionView() {
    return new this.options.collectionView.class({ childView: this.options.childView.class, collection: this.suggestions });
  }

  _setInputAttributes() {
    this.ui.autocomplete.attr({
      autocomplete: 'off',
      spellcheck: 'off',
      dir: 'auto',
      'data-toggle': 'dropdown',
    });
  }

  onKeyDown($e) {
    const key = $e.which || $e.keyCode;
    if (!(this.ui.autocomplete.val().length < this.options.minLength)) {
      if (this.actionKeysMap[key]) {
        $e.preventDefault();
        $e.stopPropagation();
        this.doAction(key, $e);
      } else if (key !== 9 && key !== 16) {
        // ignore tab or shift-tab
        clearTimeout(this.searchTimeout);
        setTimeout(() => {
          this.updateQuery(this.ui.autocomplete.val());
        }, 300);
      }
    }
  }

  onKeyUp($e) {
    const key = $e.which || $e.keyCode;
    if (!(this.ui.autocomplete.val().length < this.options.minLength)) {
      if (this.actionKeysMap[key]) {
        $e.preventDefault();
        $e.stopPropagation();
      }
    }
  }

  doAction(keycode) {
    if (!this.suggestions.isEmpty()) {
      switch (this.actionKeysMap[keycode]) {
        case 'enter':
          this.suggestions.trigger('select');
          break;
        case 'down':
          this.suggestions.trigger('highlight:next');
          break;
        case 'up':
          this.suggestions.trigger('highlight:previous');
          break;
        case 'esc':
          this.trigger(`${this.eventPrefix}:close`);
          break;
      }
    }
  }

  _stopPropagationWhenVisible(e) {
    if (this.visible) e.stopPropagation();
  }

  setDropdownShown() {
    this.visible = true;
    this.view.trigger(`${this.eventPrefix}:shown`);
    this.updateQuery(this.ui.autocomplete.val());
  }

  setDropdownHidden() {
    this.visible = false;
    this.view.trigger(`${this.eventPrefix}:hidden`);
  }

  toggleDropdown = () => {
    if (this.view && !this.view.isDestroyed()) {
      this.ui.autocomplete.dropdown('toggle');
      this.visible = this.ui.autocomplete.parent().hasClass('open');
    }
  };

  openDropdown = () => {
    if (this.view && !this.view.isDestroyed()) {
      this.ui.autocomplete.parent().addClass('open');
      this.visible = true;
    }
  };

  closeDropdown = () => {
    if (this.view && !this.view.isDestroyed()) {
      this.ui.autocomplete.parent().removeClass('open');
      this.visible = false;
    }
  };

  findRelatedSuggestions = (query) => {
    this.ui.autocomplete.val(query);
    this.updateQuery(query);
    this.toggleDropdown();
  };

  _updateQuery = (query) => {
    this.suggestions.trigger('find', query);
  };

  fillQuery = (suggestion) => {
    this.ui.autocomplete.val(suggestion.get('value'));
    this.view.trigger(`${this.eventPrefix}:active`, suggestion);
  };

  completeQuery = (suggestion) => {
    this.isDropdownClicked = true;
    this.fillQuery(suggestion);
    this.view.trigger(`${this.eventPrefix}:selected`, suggestion);
    this.toggleDropdown();
  };

  focusOutInput = () => {
    this.isDropdownClicked = false;
    setTimeout(() => {
      if (!this.isDropdownClicked) {
        this.executeFocusOutInput();
      }
    }, 300);
  };

  executeFocusOutInput = () => {
    if (this.view.isDestroyed()) return;
    const inputValue = this.ui.autocomplete.val()?.toLowerCase();
    let doClose = false;
    if (this.view.model) {
      if (this.view.model instanceof Backbone.Model) {
        doClose = this.view.model.get(this.options.collection.options.valueKey)?.toLowerCase() === inputValue;
      } else {
        doClose = this.view.model?.toLowerCase() === inputValue;
      }
    }
    if (doClose) {
      this.closeDropdown();
      return;
    }
    const suggestion = this.suggestions.find((model) => {
      const value = model.get('value');
      return value?.toLowerCase() === inputValue;
    });
    if (suggestion) {
      this.fillQuery(suggestion);
      this.view.trigger(this.eventPrefix + ':selected', suggestion);
    } else {
      this.ui.autocomplete.val('');
      this.view.trigger(`${this.eventPrefix}:selected`, null);
    }
    this.closeDropdown();
  };

  onDestroy() {
    this.collectionView.destroy();
  }
}

// Facilité de migration
const AutoComplete = { Collection, CollectionView, ChildView, Behavior };

export { Behavior, ChildView, Collection, CollectionView, AutoComplete as default };
//# sourceMappingURL=autocomplete.esm.js.map
