
  class AutoComplete.Behavior extends Marionette.Behavior

    ###*
     * @type {Object}
    ###
    defaults:
      rateLimit: 0
      minLength: 0

      collection:
        class: AutoComplete.Collection
        options:
          type: 'remote'
          remote: null
          data: []
          parseKey: null
          valueKey: 'value'
          keys:
            query: 'query'
            limit: 'limit'
          values:
            query: null
            limit: 20

      collectionView:
        class: AutoComplete.CollectionView

      childView:
        class: AutoComplete.ChildView

    ###*
     * This is the event prefix that will be used to fire all events on.
     * @type {String}
    ###
    eventPrefix: 'autocomplete'

    ###*
     * Map which code relates to what action.
     * @type {Object}
    ###
    actionKeysMap:
      27: 'esc'
      13: 'enter'
      38: 'up'
      40: 'down'

    ###*
     * @type {Object}
    ###
    events:
      'keydown @ui.autocomplete': 'onKeyDown'
      'keyup @ui.autocomplete': 'onKeyUp'
      'click @ui.autocomplete': '_stopPropagationWhenVisible'
      'shown.bs.dropdown': 'setDropdownShown'
      'hidden.bs.dropdown': 'setDropdownHidden',
      'focusout @ui.autocomplete': 'focusOutInput'

    ###*
     * Setup the AutoComplete options and suggestions collection.
    ###
    initialize: (options) ->
      @visible = no
      @options = $.extend yes, {}, @defaults, options
      @suggestions = new @options.collection.class [], @options.collection.options
      @updateQuery = _.throttle @_updateQuery, @options.rateLimit

      @_startListening()

    ###*
     * Listen to relevant events
    ###
    _startListening: ->
      @listenTo @suggestions, 'selected', @completeQuery
      @listenTo @suggestions, 'highlight', @fillQuery
      @listenTo @suggestions, 'open', @openDropdown
      @listenTo @view, "#{@eventPrefix}:find", @findRelatedSuggestions

    ###*
     * Initialize AutoComplete once the view el has been populated.
    ###
    onRender: ->
      @_setInputAttributes()
      @_buildElement()

    ###*
     * Wrap the input element inside the `containerTemplate` and
     * then append `AutoComplete.CollectionView`.
    ###
    _buildElement: ->
      @container = $ '<div class="ac-container dropdown"></div>'
      @collectionView = @getCollectionView()

      @ui.autocomplete.replaceWith @container

      @container
        .append @ui.autocomplete
        .append @collectionView.render().el

    ###*
     * Setup Collection view.
     * @return {AutoComplete.CollectionView}
    ###
    getCollectionView: ->
      new @options.collectionView.class
        childView: @options.childView.class
        collection: @suggestions

    ###*
     * Set input attributes.
    ###
    _setInputAttributes: ->
      @ui.autocomplete
        .attr
          autocomplete: off
          spellcheck: off
          dir: 'auto'
          'data-toggle': 'dropdown'

    ###*
     * Handle keydown event.
     * @param {jQuery.Event} $e
    ###
    onKeyDown: ($e) ->
      key = $e.which or $e.keyCode
  
      unless @ui.autocomplete.val().length < @options.minLength
        if @actionKeysMap[key]?
          $e.preventDefault()
          $e.stopPropagation()
          @doAction(key, $e)
        else if key isnt 9 and key isnt 16 # Ignore tab key or shift tab
          clearTimeout(@searchTimeout)  # Clear any existing timeout
          setTimeout =>
            @updateQuery @ui.autocomplete.val()
          , 100  # Delay of 100 milliseconds

    ###*
     * Handle keydown event.
     * @param {jQuery.Event} $e
    ###
    onKeyUp: ($e) ->
      key = $e.which or $e.keyCode
  
      unless @ui.autocomplete.val().length < @options.minLength
        if @actionKeysMap[key]?
          $e.preventDefault()
          $e.stopPropagation()
  
    ###*
     * Trigger action event based on keycode name.
     * @param {Number} keycode
    ###
    doAction: (keycode) ->
      unless @suggestions.isEmpty()
        switch @actionKeysMap[keycode]
          when 'enter'
            @suggestions.trigger 'select'
          when 'down'
            @suggestions.trigger 'highlight:next'
          when 'up'
            @suggestions.trigger 'highlight:previous'
          when 'esc'
            @trigger "#{@eventPrefix}:close"

    ###*
     * If the dropdown is visible stop propagation, so we can keep the dropdown visible.
     * @param {jQuery.Event} e
    ###
    _stopPropagationWhenVisible: (e) ->
      e.stopPropagation() if @visible

    ###*
     * Set visible to true and trigger an event on the view
     * so specific actions can be taken when the dropdown is opened.
    ###
    setDropdownShown: ->
      @visible = yes
      @view.trigger "#{@eventPrefix}:shown"
      @updateQuery @ui.autocomplete.val()

    ###*
     * Set visible to false and trigger an event on the view
     * so specific actions can be taken when the dropdown is closed.
    ###
    setDropdownHidden: ->
      @visible = no
      @view.trigger "#{@eventPrefix}:hidden"

    ###*
     * Toggle the autocomplete dropdown.
    ###
    toggleDropdown: =>
      if @view and not @view.isDestroyed()
        @ui.autocomplete.dropdown 'toggle'
        @visible = @ui.autocomplete.parent().hasClass('open')

    ###*
     * Toggle the autocomplete dropdown.
    ###
    openDropdown: =>
      if @view and not @view.isDestroyed()
        @ui.autocomplete.parent().addClass('open')
        @visible = yes
        
    ###*
     * Toggle the autocomplete dropdown.
    ###
    closeDropdown: =>
      if @view and not @view.isDestroyed()
        @ui.autocomplete.parent().removeClass('open')
        @visible = no
      
    ###*
     * @param {string} query
    ###
    findRelatedSuggestions: (query) ->
      @ui.autocomplete.val query
      @updateQuery query
      @toggleDropdown()

    ###*
     * Update suggestions list, never directly call this use `@updateQuery`
     * which is a limit throttle alias.
     * @param {String} query
    ###
    _updateQuery: (query) ->
      @suggestions.trigger 'find', query

    ###*
     * Complete the query using the highlighted suggestion.
     * @param  {Backbone.Model} suggestion
    ###
    fillQuery: (suggestion) ->
      @ui.autocomplete.val suggestion.get 'value'
      @view.trigger "#{@eventPrefix}:active", suggestion

    ###*
     * Complete the query using the selected suggestion.
     * @param  {Backbone.Model} suggestion
    ###
    completeQuery: (suggestion) ->
      @isDropdownClicked = yes
      @fillQuery suggestion
      @view.trigger "#{@eventPrefix}:selected", suggestion
      @toggleDropdown()

    ###*
    * FocusOut input event.
    ###
    focusOutInput: ->
      @isDropdownClicked = no
      setTimeout(() =>
        if not @isDropdownClicked
          @executeFocusOutInput()
      , 150)
    
    ###*
      * Execute the focusOut input logic.
    ###
    executeFocusOutInput: ->
      return if @view.isDestroyed()

      inputValue = @ui.autocomplete.val()?.toLowerCase()
      
      suggestion = @suggestions.find (model) ->
        value = model.get('value')
        value?.toLowerCase() is inputValue
  
      if suggestion
        this.fillQuery(suggestion)
        this.view.trigger(this.eventPrefix + ":selected", suggestion)
      else
        @ui.autocomplete.val('')
        @view.trigger "#{@eventPrefix}:selected", null
        
      @closeDropdown()
  
    ###*
     * Clean up `AutoComplete.CollectionView`.
    ###
    onDestroy: ->
      @collectionView.destroy()

  AutoComplete
