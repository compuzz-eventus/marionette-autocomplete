import _ from 'underscore';
import $ from 'jquery';
import Marionette from 'backbone.marionette';

export class ChildView extends Marionette.View {
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

export default ChildView;
