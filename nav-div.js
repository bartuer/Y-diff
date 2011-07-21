include('lib.ajax.js');
window.$=function(a){return document.getElementById(a)};

/////////////////////// debug flag ////////////////////////
var debug = false;


/////////////////////// adjustable parameters //////////////////
var minStep = 10;
var nSteps = 30;
var stepInterval = 10;
var blockRange = 5; // how far consider one page blocked
var nodeHLColor = 'yellow';
var lineHLColor = '#FFFF66';
var lineBlockedColor = '#E9AB17';
var bgColor = '';
var bodyBlockedColor = '#FAF0E6';


///////////////////////// globals ////////////////////////
var eventCount = {
  'left': 0,
  'right': 0
};
var moving = false;
var matchId1 = 'leftstart';
var matchId2 = 'rightstart';
var matchLineId1 = -1;
var matchLineId2 = -1;
var cTimeout;


///////////////////////// utilities ///////////////////////
// No Math.sign() in JS?

function sign(x) {
  if (x > 0) {
    return 1;
  } else if (x < 0) {
    return -1;
  } else {
    return 0;
  }
}


function log(msg) {
  if (debug) {
    console.log(msg);
  }
}



function elementPosition(id) {
  obj = document.getElementById(id);
  var curleft = 0,
    curtop = 0;

  if (obj && obj.offsetParent) {
    curleft = obj.offsetLeft;
    curtop = obj.offsetTop;

    while (obj = obj.offsetParent) {
      curleft += obj.offsetLeft;
      curtop += obj.offsetTop;
    }
  }

  return {
    x: curleft,
    y: curtop
  };
}


/*
 * Scroll the window to relative position, detecting blocking positions.
 */

function scrollWithBlockCheck(container, distX, distY) {
  var oldTop = container.scrollTop;
  var oldLeft = container.scrollLeft;

  container.scrollTop += distY; // the ONLY place for actual scrolling
  container.scrollLeft += distX;

  var actualX = container.scrollLeft - oldLeft;
  var actualY = container.scrollTop - oldTop;
  log("distY=" + distY + ", actualY=" + actualY);
  log("distX=" + distX + ", actualX=" + actualX);

  // extra leewaw here because Chrome scrolling is horribly inacurate
  if ((Math.abs(distX) > blockRange && actualX === 0) || Math.abs(distY) > blockRange && actualY === 0) {
    log("blocked");
    container.style.backgroundColor = bodyBlockedColor;
    return true;
  } else {
    eventCount[container.id] += 1;
    container.style.backgroundColor = bgColor;
    return false;
  }
}


function getContainer(elm) {
  while (elm && elm.tagName !== 'DIV') {
    elm = elm.parentElement || elm.parentNode;
  }
  return elm;
}


/*
 * timed animation function for scrolling the current window
 */

function matchWindow(linkId, targetId, n) {
  moving = true;

  var link = document.getElementById(linkId);
  var target = document.getElementById(targetId);
  var linkContainer = getContainer(link);
  var targetContainer = getContainer(target);

  var linkPos = elementPosition(linkId).y - linkContainer.scrollTop;
  var targetPos = elementPosition(targetId).y - targetContainer.scrollTop;
  var distY = targetPos - linkPos;
  var distX = linkContainer.scrollLeft - targetContainer.scrollLeft;


  log("matching window... " + n + " distY=" + distY + " distX=" + distX);

  if (distY === 0 && distX === 0) {
    clearTimeout(cTimeout);
    moving = false;
  } else if (n <= 1) {
    scrollWithBlockCheck(targetContainer, distX, distY);
    moving = false;
  } else {
    var stepSize = Math.floor(Math.abs(distY) / n);
    actualMinStep = Math.min(minStep, Math.abs(distY));
    if (Math.abs(stepSize) < minStep) {
      var step = actualMinStep * sign(distY);
    } else {
      step = stepSize * sign(distY);
    }
    var blocked = scrollWithBlockCheck(targetContainer, distX, step);
    var rest = Math.floor(distY / step) - 1;
    log("blocked?" + blocked + ", rest steps=" + rest);
    if (!blocked) {
      cTimeout = setTimeout("matchWindow(" + linkId + "," + targetId + "," + rest + ")", stepInterval);
    } else {
      clearTimeout(cTimeout);
      moving = false;
    }
  }
}



////////////////////////// highlighting /////////////////////////////
var highlighted = [];

function putHighlight(id, color) {
  var elm = document.getElementById(id);
  if (elm !== null) {
    elm.style.backgroundColor = color;
    if (color !== bgColor) {
      highlighted.push(id);
    }
  }
}


function clearHighlight() {
  for (i = 0; i < highlighted.length; i += 1) {
    putHighlight(highlighted[i], bgColor);
  }
  highlighted = [];
}



/*
 * Highlight the link, target nodes and their lines,
 * then start animation to move the other window to match.
 */

function highlight(me, linkId, targetId, linkLineId, targetLineId) {
  if (me.id === 'left') {
    matchId1 = linkId;
    matchId2 = targetId;
  } else {
    matchId1 = targetId;
    matchId2 = linkId;
  }

  clearHighlight();

  putHighlight(linkId, nodeHLColor);
  putHighlight(targetId, nodeHLColor);
  putHighlight(linkLineId, lineHLColor);
  putHighlight(targetLineId, lineHLColor);

  matchWindow(linkId, targetId, nSteps);
}


function instantMoveOtherWindow(me) {
  log("me=" + me.id + ", eventcount=" + eventCount[me.id]);
  log("matchId1=" + matchId1 + ", matchId2=" + matchId2);

  me.style.backgroundColor = bgColor;

  if (!moving && eventCount[me.id] === 0) {
    if (me.id === 'left') {
      matchWindow(matchId1, matchId2, 1);
    } else {
      matchWindow(matchId2, matchId1, 1);
    }
  }
  if (eventCount[me.id] > 0) {
    eventCount[me.id] -= 1;
  }
}


function getTarget(x) {
  x = x || window.event;
  return x.target || x.srcElement;
}

var c = ["deletion", "insertion", "change", "move", "move-change", "unchanged"];
var tip = ["deleted", "inserted", "change", "same", "same", "same"];

function m(e) {
  if (typeof e === 'string') {
    this.appendChild(document.createTextNode(e));
  } else if (typeof e === 'object') {
    if (e.i) {
      var n = document.createElement('a');
      n.setAttribute('tid', e.i);
      n.setAttribute('class', c[e.c]);
      n.setAttribute('id', e.i + 1);
      n.setAttribute('title', tip[e.c]);
      n.innerHTML = e.s;
      this.appendChild(n);
      n.onclick = function (e) {
        var t = getTarget(e);
        var lid = t.id;
        var tid = t.getAttribute('tid');
        var container = getContainer(t);
        highlight(container, lid, tid, 'ignore', 'ignore');
      };
    } else {
      var s = document.createElement('span');
      s.setAttribute('class', c[e.c]);
      s.setAttribute('title', tip[e.c]);
      s.innerHTML = e.s;
      this.appendChild(s);
    }
  } else {
    throw 'render data type err';
  }
}

window.onload = function (e) {
  var g = new Ajax.Request("/d.json", {
    asynchronous: true,
    method: 'get',
    onComplete: function (resp) {
      var o = JSON.parse(resp.responseText);
      o.left.forEach(m,$('leftstart').parentNode);
      o.right.forEach(m,$('rightstart').parentNode);
      [$('left'), $('right')].forEach(function (e) {
        e.onscroll = function (e) {
          instantMoveOtherWindow(getTarget(e));
        };
      });
    }
  });
};