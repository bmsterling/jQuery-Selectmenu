/*
    some code inspired by Felix Nagel : https://github.com/fnagel/jquery-ui
*/
(function ($, undefined) {

$.widget( "ui.selectmenu", {
    ns     : '.selectmenu',
    visual : '' + 
                '<div class="ui-helper-reset ui-widget ui-state-default ui-corner-all ui-selectmenu">' +
                    '<span class="ui-helper-hidden-accessible">Your selection is </span>' +
                    '<span class="ui-selectmenu-status"></span>' + 
                    '<span class="ui-selectmenu-icon ui-icon ui-icon-carat-1-s"></span>' +
                '</div>'+
            '',
    options : {
        appendTo  : 'body',
        zindex    : null,
        width     : null,
        menuWidth : null,
        hasTouch  : !!('ontouchstart' in window || window.navigator.msPointerEnabled)
    },

    _create : function () {

        var
        self              = this,
        opts              = self.options,
        selectMenuId = self.element.uniqueId().attr( "id" ),
        selectOptionData = [],
        zindex;
        
        self.hasTouch = opts.hasTouch;
                
        // define safe mouseup for future toggling
        self._safemouseup = true;
        self.isOpen = false;
        
        self.menu = $(self.visual).attr({
            'id'    : selectMenuId,
            'role'  : 'status'
        });

        self.element.wrap('<div class="ui-selectmenu-wrap"></div>').after(self.menu);

        self.menu.data('selectmenu', self.element);

        self.element.parent().css({
            position :'relative',
            width    : opts.width || self.element.outerWidth(),
            display  : self.element.css('display') // ensure the selectmenu flows as dev intended
        });

        // create menu portion, append to body
        self.list = $( '<ul />', {
            'class': 'ui-helper-reset ui-widget',
            'aria-hidden': true,
            'role': 'listbox',
            'aria-labelledby': selectMenuId,
            'id': selectMenuId + '-menu'
        });
        
        self.listWrap = $( "<div />", {
            'class': 'ui-selectmenu-menu'
        }).append( self.list ).appendTo( opts.appendTo );

        // serialize selectmenu element options
        self.element.find( 'option' )
        .each( function() {
            var 
            opt = $( this );

            selectOptionData.push({
                value          : opt.attr( 'value' ),
                text           : opt.text(),
                selected       : opt.attr( 'selected' ),
                disabled       : opt.attr( 'disabled' ),
                classes        : opt.attr( 'class' ),
                typeahead      : opt.attr( 'typeahead'),
                parentOptGroup : opt.parent( 'optgroup' )
            });
        });

        // write li's
        if ( selectOptionData.length ) {
            var
            index = 0,
            thisSPAN,
            count = selectOptionData.length,
            thisLiAttr = {};
            
            for (; index<count; index++) {
                var
                thisLi,
                thisSPANAttr,
                select = selectOptionData[ index ];
                thisLiAttr = { role : 'presentation' };
                
                if ( select.disabled ) {
                    thisLiAttr[ 'class' ] = 'ui-state-disabled';
                }

                thisSPANAttr  = {
                    html: select.text || '&nbsp;',
                    tabindex : -1,
                    role: 'option',
                    'aria-selected' : false
                };

                if ( select.disabled ) {
                    thisAAttr[ 'aria-disabled' ] = select.disabled;
                }

                thisSPAN = $( '<span/>', thisSPANAttr );
                
                thisLi = $( '<li/>', thisLiAttr ).data( 'index', index )
                            .addClass( select.classes )
                            .data( 'optionClasses', select.classes || '' )
                            .append( thisSPAN );
                    
                thisLi.appendTo( self.list );
            }
        }

        // reset height to auto
        var 
        p = self.list.wrap('<div class="ui-selectmenu-inner ui-widget-content"></div>').parent().css( 'height', 'auto' ),
        listH = self.listWrap.height(),
        winH = $( window ).height(),
        // calculate default max height
        maxH = opts.maxHeight ? Math.min( opts.maxHeight, winH ) : winH / 3;

        if ( listH > maxH ) {
            p.height( maxH );
        }

        self._hoverable( self.menu );
        self._focusable( self.menu );
        
        self._on( self.menu, {
            'click' : self._onClick
        });
        self._on( self.list, {
            'click li' : self._onListClick
        });
        self._on( self.list, {
            'mouseenter li' : self._onListEnter
        });
        self._on( self.list, {
            'mouseleave li' : self._onListLeave
        });
        
        self._on( self.menu, {
            'keyup' : self._onChange
        });
        
        // all the select menu specific events
        self._on( self.element, {
            'keyup' : self._onChange
        });
        self._on( self.element, {
            'change' : self._onChange
        });
        self._on( self.element, {
            'blur' : function () {
                if (self.isOpen) {
                    self._delay( self._hide, 250 );
                }
            }
        });
        
        self._refresh();

        $(self.element).css({
            'zIndex'   : -1,
            'position' : 'absolute',
            'top'      : 0,
            'left'     : 0,
            'height'   : '100%',
            'width'    : '100%',
            'padding'  : '0',
            'border'   : 'none'
        }).addClass('ui-corner-all');
    },

    _refresh : function () {
        var
        self = this,
        status = $('.ui-selectmenu-status', self.menu);
        
        status.text( self.element.find(':selected').text());
    },

    _onChange : function () {
        var
        self = this,
        selectedIndex,
        selectedEl;
        
        self._refresh();
        
        selectedIndex = self._getIndexAttr();
        
       $('.ui-selectmenu-item-selected', self.list)
       .removeClass('ui-selectmenu-item-selected ui-state-highlight')
       .find('a').attr('aria-selected',false);
       
       selectedEl = self.list.children(':eq('+selectedIndex+')');
       
       selectedEl
       .addClass('ui-selectmenu-item-selected ui-state-highlight')
       .find('a').attr('aria-selected',true);
    },
    
    _onClick : function (e) {
        var
        self = this,
        id   = self.element.attr('id'),
        label = $('label[for='+id+']');
        
        if (self.hasTouch) {
            var event;
            event = document.createEvent('MouseEvents');
            event.initMouseEvent('mousedown', true, true, window);
            self.element.get(0).dispatchEvent(event);
            return;
        }
        
        self._safemouseup = false;
        setTimeout( function() { self._safemouseup = true; }, 300 );
        
        if (self.isOpen) {
            self._hide();
        }
        else {
            self._position();
            self._show();
        }
    },
    
    _position : function () {
                var 
        self = this,
        opts = self.options,
        positionDefault = {
            of: self.menu,
            my: "left top",
            at: "left bottom",
            collision: 'flip'
        };

        self.listWrap
        .removeAttr( 'style' )
        .width( opts.menuWidth || self.menu.outerWidth())
            .zIndex( 99999 )
            .position( positionDefault );
    },
    
    _show : function () {
                var 
        self = this;
        
        self.isOpen = true;
        self.listWrap.show();
        self._giveFocus();
    },
    
    _hide : function () {
                var 
        self = this;
        
        self.isOpen = false;
        self.listWrap.hide();
        self._giveFocus();
    },
    
    _giveFocus : function () {
        this.element.focus();
    },
    
    _getIndexAttr :  function () {
        var
        self = this,
        selectedIndex = self.element.get(0).selectedIndex;
        
        return selectedIndex;
    },
    
    _setIndexAttr : function (index) {
        var
        self = this,
        opts = self.element[0].options,
        option;
        
        if (!isNaN(parseFloat(index)) && isFinite(index)) {
            option = opts[index];
            option.selected = true;
        }
        
        self.element.trigger('change');
    },
    
    _onListClick : function (e) {
        var
        self = this,
        el   = e.currentTarget,
        selectedIndex = $(el).data('index');
        
        self._setIndexAttr(selectedIndex);
        
        self._hide();
    },
    
    _onListEnter : function (e) {
        var
        self = this,
        el   = e.currentTarget;
        
        $(el).addClass('ui-state-hover');
    },
    _onListLeave : function (e) {
        var
        self = this,
        el   = e.currentTarget;
        
        $(el).removeClass('ui-state-hover');
    }
});

}( jQuery ) );