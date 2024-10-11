
  class AutoComplete.Collection extends Backbone.Collection

    ###*
     * Setup remote collection.
     * @param {(Array|Backbone.Model[])} models
     * @param {Object} options
    ###
    initialize: (models, @options) ->
      @setDataset @options.data
      @_startListening()
      @loading = false

    ###*
     * Listen to relavent events
    ###
    _startListening: ->
      @listenTo @, 'find', @fetchNewSuggestions
      @listenTo @, 'select', @select
      @listenTo @, 'highlight:next', @highlightNext
      @listenTo @, 'highlight:previous', @highlightPrevious
      @listenTo @, 'clear', @reset
      @listenTo @, 'load:more', @loadMore


    ###*
     * Save models passed into the constructor seperately to avoid
     * rendering the entire dataset.
     * @param {(Array|Backbone.Model[])} dataset
    ###
    setDataset: (dataset) ->
      @dataset = @parse dataset, no

    ###*
     * Parse API response
     * @param  {Array} suggestions
     * @param  {Boolean} limit
     * @return {Object}
    ###
    parse: (suggestions, limit) ->
      suggestions = @getValue suggestions, @options.parseKey if @options.parseKey
      suggestions = _.take suggestions, @options.values.limit if limit

      _.map suggestions, (suggestion) ->
        _.extend suggestion, value: @getValue suggestion, @options.valueKey
      , @

    ###*
     * Get the value from an object using a string.
     * @param  {Object} obj
     * @param  {String} prop
     * @return {String}
    ###
    getValue: (obj, prop) ->
      _.reduce prop.split('.'), (segment, property) ->
        segment[property]
      , obj

    ###*
     * Get query parameters.
     * @param {String} query
     * @return {Obect}
    ###
    getParams: (query) ->
      data = {}

      data[@options.keys.query] = query

      _.each @options.keys, (value, key) ->
        data[value] ?= @options.values[key]
      , @

      { data }

    ###*
     * Get suggestions based on the current input. Either query
     * the api or filter the dataset.
     * @param {String} query
    ###
    fetchNewSuggestions: (query) ->
      @trigger 'open'
      switch @options.type
        when 'remote'
          method = @options.method || 'GET'
          contentType = 'application/json'
          if method == 'POST'
            contentType = 'application/x-www-form-urlencoded'
          @fetch _.extend url: @options.remote, reset: yes, type: method, contentType: contentType, @getParams query
        when 'dataset'
          @filterDataSet query
        else
          throw new Error 'Unkown type passed'

    ###*
     * Filter the dataset.
     * @param {String} query
    ###
    filterDataSet: (query) ->
      matches = []
      @index = -1

      _.each @dataset, (suggestion) ->
        return false if matches.length >= @options.values.limit

        matches.push suggestion if @matches suggestion.value, query

      , @

      @set matches

    ###*
     * Check to see if the query matches the suggestion.
     * @param  {String} suggestion
     * @param  {String} query
     * @return {Boolean}
    ###
    matches: (suggestion, query) ->
      suggestion = @normalizeValue suggestion
      query = @normalizeValue query

      suggestion.indexOf(query) >= 0

    ###*
     * Normalize string.
     * @return {String}
    ###
    normalizeValue: (string = '') ->
      string
        .toLowerCase()
        .replace /^\s*/g, ''
        .replace /\s{2,}/g, ' '

    ###*
     * Select first suggestion unless the suggestion list
     * has been navigated then select at the current index.
    ###
    select: ->
      return if @isStarted()
      
      @trigger 'selected', @at @index

    ###*
     * highlight previous item.
    ###
    highlightPrevious: ->
      unless @isFirst() or not @isStarted()
        @removeHighlight @index
        @highlight @index = @index - 1

    ###*
     * highlight next item.
    ###
    highlightNext: ->
      if @options.lazyLoad and @is5thFromLast() and !@loading and !@allLoaded
        @loadMore()

      unless @isLast()

        if @isStarted()
          @removeHighlight @index

        @highlight @index = @index + 1

    ###*
     * Check to see if the first suggestion is highlighted.
     * @return {Boolean}
    ###
    isFirst: ->
      @index is 0

    ###*
     * Check to see if the last suggestion is highlighted.
     * @return {Boolean}
    ###
    isLast: ->
      @index + 1 is @length

    is5thFromLast: ->
      @index + 1 is @length - 5

    ###*
     * Check to see if we have navigated through the
     * suggestions list yet.
     * @return {Boolean}
    ###
    isStarted: ->
      @index isnt -1

    ###*
     * Trigger highlight on suggestion.
     * @param  {Number} index
     * @return {Backbone.Model}
    ###
    highlight: (index) ->
      model = @at index
      model.trigger 'highlight', model

    ###*
     * Trigger highliht removal on the model.
     * @param  {Number} index
     * @return {Backbone.Model}
    ###
    removeHighlight: (index) ->
      model = @at index
      model.trigger 'highlight:remove', model

    ###*
     * Reset suggestions
    ###
    reset: ->
      @index = -1
      @allLoaded = false
      # check if the first arguments is less length that limit
      if @length < @options.values.limit
        @allLoaded = true
      super arguments...

    loadMore: ->
      if !@loading and !@allLoaded
        @loading = true
        that = @ # can not use _.bind(this) because it is not the same context
        url = that.options.remote
        p = that.getParams(@currentQuery, @length)
        params = $.param(p.data)

        # if that.options.method equals 'POST'
        if that.options.method == 'POST'
          $.ajax
            url: url
            type: 'POST'
            data: params
            contentType: 'application/x-www-form-urlencoded'
            success: (resp) =>
              that.parse(resp)
              that.push(resp)
              that.trigger('sync')
              @loading = false
              if resp.length != that.options.values.limit
                @allLoaded = true
                that.trigger 'all:loaded'
        else
          $.ajax
            url: "#{url}&#{params}"
            success: (resp) =>
              that.parse(resp)
              that.push(resp)
              that.trigger('sync')
              @loading = false
              if resp.length != that.options.values.limit
                @allLoaded = true
                that.trigger 'all:loaded'

    getParams: (query, first) ->
      @currentQuery = query
      data = {}
      that = @ # can not use _.bind(this) because it is not the same context
      data[that.options.keys.query] = query
      _.each that.options.keys, (value, key) ->
        data[value] = data[value] or that.options.values[key]
        data[value]
      data.first = if first then first else '0'
      {data}
