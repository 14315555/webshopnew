//NOTE:  NO PROTOTYPE IN ADS.JS!  (because of /mobile and newhome!)
if (!window.Scribd) var Scribd = {};
if (!Scribd.Ads) Scribd.Ads = {};

Scribd.Ads.attributes = {};

Scribd.Ads.addAttribute = function(name, value) {
  if (value !== undefined) {
    var attributes = Scribd.Ads.attributes[name] = Scribd.Ads.attributes[name] || [];

    if (value instanceof Array) {
      attributes.push.apply(attributes, value);
    }
    else {
      attributes.push(value);
    }
  }
};

//useful for ad layout tracking. Ensures that the attributes it adds to has only one value.
//if the new value is smaller, it overwrites the value.
Scribd.Ads.addAttributeIfSmaller = function (name, value) {
  var attributes = Scribd.Ads.attributes[name];
  if (!attributes) {
    Scribd.Ads.addAttribute(name, value);
  } else if (attributes.length > 1) {
    throw "can't use Scribd.Ads.addAttributeIfSmaller for attributes, '"+name+"' with multiple values";
  } else {
    Scribd.Ads.attributes[0] = [Scribd.Ads.attributes[0], value].min();
  }
};

if (Scribd.Ads.enabled) {
  Scribd.Ads.max_between_page = 21;

  //THIS CODE IS HERE AS A WARNING!
  // in the past, using gpt to refresh ads would
  // not actually fill ads after a few refreshes.
  // so run a test before actually using this...

  Scribd.Ads.GPTRefreshUnit = function (name) {
    //look at ref 1899542f3042f3b185ae670d68e438ddf3a87f29 for implementation (132-162)
  };

  // abstraction for refreshUnit objects...
  Scribd.Ads.RefreshUnit = function(name) {
    var params;
    Scribd.Ads.RefreshUnit.all[name] = this;
    params = Scribd.Ads.setupIframeUnit(name);
    this.width = params.size[0];
    this.height = params.size[1];
    this.url_params = params.url_params;
    this.name = name;

    Scribd.Ads.observeUserActivity();

    this.listenForHover();
    this.lastRefreshed = 0;
    this.setupRefresh();
  };

  Scribd.Ads.RefreshUnit.prototype = {
    container: function() {
      return document.getElementById(this.name + '_container');
    },
    setupRefresh: function() {
      this.timesRefreshed = 0;
      this.timer = null;
      this.setNextRefresh();
    },
    listenForHover: function() {
      var self = this;
      this.isOver = false;
      // only have 'observe' when not in mobile.
      if( this.container().observe ) {
        this.container().observe('mouseenter', function() {
          self.isOver = true;
        }).observe('mouseleave', function() {
          self.isOver = false;
        });
      } else {
        self.isOver = false;
      }
    },
    getDuration: function() {
      if(this._duration)
        return this._duration;
      else
        return Scribd.Ads.refreshInterval * 1000;
    },
    resetDuration: function() {
      delete(this._duration);
      return this.getDuration();
    },

    duration: function(newDuration) {
      if(typeof(newDuration) === 'number') {
        if (newDuration < 1000)
          newDuration *= 1000;
        //set the duration
        this._duration = newDuration;
        this.setNextRefresh();
        //and reset the timer
      }
      return this.getDuration();
    },

    stopRefreshing: function() {
      clearTimeout(this.timer);
      delete(this.timer);
    },

    setNextRefresh: function() {
      var timeLeft, self;
      this.stopRefreshing();
      self = this;
      //is it time yet?

      timeLeft = this.duration() - ((new Date()).getTime() - this.lastRefreshed);
      if(timeLeft <= 0) {
        this.refresh();
        timeLeft = 10000; //timeout for ad loading
      }

      this.timer = setTimeout(function() { self.setNextRefresh(); }, timeLeft);
    },

    refresh: function() {
      //throw refresh in here...
      if ((Scribd.Ads.userIsActive || !Scribd.Ads.trackEngagement) &&
        !this.isOver) {
        //invalidating lastRefreshed, which should be set from ad_refresher
        this.resetDuration();
        this.lastRefreshed = null;
        this.actuallyRefresh();
      }
    },

    actuallyRefresh: function() {
      var self = this;
      setTimeout(function() {
        Scribd.Ads.replaceIframe(self.name, self.width, self.height, self.url_params);
      }, 0);
    },

    //called from ad_refresher
    iframeLoaded:  function() {
      this.lastRefreshed = (new Date()).getTime();
      this.timesRefreshed += 1;
    }
  };

  Scribd.Ads.RefreshUnit.get = Scribd.Ads.RefreshUnit.all = {};

  Scribd.Ads.displayedAdUnits = [];
  Scribd.Ads.addUnit = function(unit_name, node_id, delay) {
    node_id = node_id || unit_name + '_container';
    Scribd.Ads.displayedAdUnits.push(node_id);
    var showAdFunc = function() {
      googletag.display(node_id);
    };
    //handle late loading ads...
    if(delay) {
      delay = parseInt(delay, 10);
      if(delay === 0 || isNaN(delay))
        delay = 50; //default delay
      var old_onload = window.onload;

      window.onload = function() {
        if(old_onload)
          old_onload();
        setTimeout(function() {
          if(googletag.cmd instanceof Array)
            googletag.cmd.push(showAdFunc);
          else
            showAdFunc();
        }, delay);
      };
    } else {
      googletag.cmd.push(showAdFunc);
    }
  };

  Scribd.Ads.betweenUnitForPage = function(page_num) {
    var name;
    if (page_num == 1)
      return ['Doc_Between_Top_FullBanner_468x60', false];
    else if (page_num == 2)
      return ['Doc_Between_Leaderboard_BTF_679x250', true];
    else if (page_num % 2 == 1 && page_num <= 21)
      return ['Doc_Between_Leaderboard_BTF_728x90_' + page_num, false];
  };

  Scribd.Ads.addBetweenPageUnit = function(page_num) {
    if (Scribd.Ads.attributes['UserState'].indexOf('In') >= 0 && !Scribd.Ads.attributes['FBRecent'][0])
      return;

    if (navigator.userAgent.match(/iPad/i))
      return;

    // don't show ads on paid doc
    if (Scribd.current_doc && Scribd.current_doc.is_paid)
      return;


    var unit = Scribd.Ads.betweenUnitForPage(page_num);
    if (!unit) return;
    var name = unit[0];
    var should_hide = unit[1];
    var ad_container = document.getElementById('between_page_ads_' + page_num);
    var inner_container = document.createElement('div');
    inner_container.id = 'between_page_ads_inner_' + page_num;
    ad_container.appendChild(inner_container);

    if(should_hide)
      ad_container.style.display = 'none';

    Scribd.Ads.addUnit(name, inner_container.id, page_num != 1);
  };

  Scribd.Ads.setupIframeUnit = function(name) {
    var url_params, size;
    url_params = 'ad_unit=' + escape(name);
    size = name.match(/.*_(\d+)x(\d+)$/)
               .slice(1)
               .map(function(f){return parseInt(f,10);});


    return { size: size, url_params: url_params };
  };

  Scribd.Ads.addPassbackUnit = function(name, replacingName) {
    var params = Scribd.Ads.setupIframeUnit(name);
    Scribd.Ads.replaceIframe(replacingName, params.size[0], params.size[1], params.url_params, 0);
  };

  Scribd.Ads.addRefreshUnit = function(name) {
    return new Scribd.Ads.RefreshUnit(name);
  };

  Scribd.Ads.replaceIframe = function(name, width, height, url_params) {
    var iframe, container, interval;
    container = document.getElementById(name + '_container');
    if(container && container.hasChildNodes())
      container.parentNode.replaceChild(container.clone(false), container);

    iframe = document.createElement('iframe');
    iframe.width = width;
    iframe.height = height;
    iframe.scrolling = 'no';
    iframe.frameBorder = 0;
    iframe.marginWidth = 0;
    iframe.marginHeight = 0;
    iframe.allowTransparency = true;
    iframe.src = '/ad_refresher.html#' + url_params;
    container.appendChild(iframe);
  };

  var get_server_option = function(name, default_value) {
    if (typeof Scribd.ServerOptions == 'undefined' || eval('typeof Scribd.ServerOptions.' + name) == 'undefined')
      return default_value;

    return eval('Scribd.ServerOptions.' + name);
  };

  Scribd.Ads.trackEngagement = false;
  Scribd.Ads.userIsActive = false;
  Scribd.Ads.inactivityTimer = null;
  Scribd.Ads.idleTimeBeforeInactive = get_server_option('ad_refresh_idle_time_before_inactive', 60);
  Scribd.Ads.refreshInterval = get_server_option('ad_refresh_interval', 60);
  Scribd.Ads.delayBeforeTrackingEngagement = get_server_option('ad_refresh_engagement_tracking_delay', 0);

  setTimeout(function() {
    Scribd.Ads.trackEngagement = true;
  }, Scribd.Ads.delayBeforeTrackingEngagement * 1000);

  Scribd.Ads.onUserActivity = function() {
    Scribd.Ads.userIsActive = true;
    clearTimeout(Scribd.Ads.inactivityTimer);
    Scribd.Ads.inactivityTimer = setTimeout(Scribd.Ads.onUserInactivity, Scribd.Ads.idleTimeBeforeInactive * 1000);
  };

  Scribd.Ads.onUserInactivity = function() {
    Scribd.Ads.userIsActive = false;
  };

  Scribd.Ads.observingUserActivity = false;

  Scribd.Ads.observeUserActivity = function() {
    if (!Scribd.Ads.observingUserActivity) {
      Scribd.Ads.onUserActivity(); // we consider them active to start off
      document.observe('mousemove', Scribd.Ads.onUserActivity);
      Event.observe(window, 'scroll', Scribd.Ads.onUserActivity);
      Scribd.Ads.observingUserActivity = true;
    }
  };

  Scribd.Ads.onViewModeChange = function(new_mode, old_mode) {
    if (old_mode == 'scroll')
      $$('.between_page_ads').each(function(ad) { ad.hide(); });
    if (new_mode == 'scroll')
      $$('.between_page_ads').each(function(ad) { ad.show(); });
  };

  if (typeof docManager !== 'undefined') {
      docManager.addEvent('viewmodeChanged', Scribd.Ads.onViewModeChange);
  }

} else {
  // if ads disabled, lets remove functionality from all those methods...
  // note: Originally addAttribute was here. Removing it because I want to set this attribute regardless of the presence of ads
  (function() {
    var resetThese = [ 'addRefreshUnit', 'addUnit','addBetweenPageUnit'];
    var doNothing = function() {};
    for(var i = resetThese.length - 1; i >= 0; i -= 1) {
      Scribd.Ads[resetThese[i]] = doNothing;
    }
  })();
}

Scribd.Ads.setAdLayouts = function () {
  // NOTE: right now some of these Scribd.current_user values are being set in document_setup.rb...there might be a better place to put them.

  // Disable ads if you have purchased this document.
  if (Scribd.current_user) {
    Scribd.Ads.addAttributeIfSmaller("AdLayout",1);

    if (Scribd.current_user.has_purchased) {
      Scribd.Ads.addAttributeIfSmaller("AdLayout", 0);
      trackEvent("AdTargeting", "SpecialCase", "UserPurchasedDocument", 0, false);
    }

    // Disable ads if you are the owner of the document.
    if (Scribd.current_doc && Scribd.current_doc.is_owner) {
      Scribd.Ads.addAttributeIfSmaller("AdLayout",0);
      trackEvent("AdTargeting", "SpecialCase", "UserViewingOwnDocument", 0, false);
    }

    // Disable ads if you have uploaded 3 or more documents.
    if (Scribd.current_user.uploaded_at_least_three) {
      Scribd.Ads.addAttributeIfSmaller("AdLayout",0);
      trackEvent("AdTargeting", "SpecialCase", "UserUploadedThreeOrMore", 0, false);
    }
  }
  else {
    Scribd.Ads.addAttributeIfSmaller("AdLayout", 3);
  }

  if (Scribd.current_doc) {
    // If you are viewing a private document, get layout 1.
    if (Scribd.current_doc.is_private) {
      Scribd.Ads.addAttributeIfSmaller("AdLayout",1);
      trackEvent("AdTargeting", "SpecialCase", "UserViewingPrivateDoc", 0, false);
    }

    // If you are viewing a store document that you have not purchased, get layout 1.
    if (Scribd.current_doc.can_purchase) {
      Scribd.Ads.addAttributeIfSmaller("AdLayout",1);
      trackEvent("AdTargeting", "SpecialCase", "UserViewingUnpurchasedDoc", 0, false);
    }
  }

  Scribd.Ads.setRefererType();

  trackEvent("AdTargeting", "AdLayout", Scribd.Ads.attributes['AdLayout'][0]+'', 0, false);


};

Scribd.Ads.setRefererType = function () {
  var ref = document.referrer;
  var domainPattern = /^https?:\/\/([^\/]+)/i;
  var queryPattern = /[?&][pq]=([^&]*)/i;
  var withoutSubdomainsPattern = /^(?:[^.]+\.)?([^.]+\.(?:(?:ac|com|edu|gc|gov|net|org|per|sch|co)\.)?[^.]+)$/i;

  var urlMatches = ref.match(domainPattern);

  if (urlMatches) {

    var url = urlMatches[1];

    var domainMatches = url.match(withoutSubdomainsPattern);
    if (domainMatches) {
      var domain = domainMatches[1];

      var queryMatches = ref.match(queryPattern);

      var referrerType;

      if (queryMatches) {
        var query = queryMatches[1];
        if (query.match(/scribd/i)) {
          referrerType = "branded search";
        }
        else {
          referrerType = "organic search";
        }

        Scribd.Ads.addAttributeIfSmaller(3);
      } else if (domain.match(/google|yahoo|ask|bing/i)) {
        referrerType = 'unknown search';
        Scribd.Ads.addAttributeIfSmaller(3);
      }


      if (domain.match(/^ycombinator.com|hackerne.ws|reddit.com$/i)) {
        referrerType = "premium";
        if (domain !== "reddit") {
          domain = "hackernews";
        }
        Scribd.Ads.addAttributeIfSmaller("AdLayout",1);
      }

      if (referrerType) {
        trackEvent("refererType", domain, referrerType, 0, false);
      }
    }
  }
};

