/* =========================================================================
   JARVIS — skills
   -------------------------------------------------------------------------
   A skill is { id, match, run }. `match` is a RegExp tested against the
   heard/typed line; `run` returns { say, panel, toast, action }.

   Order matters — the first match wins, so put the specific ones above the
   general ones. Adding your own is three lines at the bottom of the list.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.skills = (function () {
  'use strict';

  var U = JARVIS.util;

  function D() { return JARVIS.data.get(); }
  function P() { return JARVIS.data.product; }

  /* ---- Hook / script generation ----------------------------------------
     Template-driven, on purpose: it runs offline with no key and no cost.
     If you want real generation, set JARVIS.brain.endpoint (see README) and
     these fall through to your model instead. */
  var HOOKS = [
    'POV: {t} — and nobody told you it was this easy',
    'I tried {t} for 30 days. Here\'s the part nobody posts.',
    'Stop doing {t} like it\'s 2023.',
    'The {t} mistake that cost me a month',
    '{t}, explained in 40 seconds',
    'Nobody is talking about {t} and it\'s making people money',
    'I asked 3 people about {t}. All 3 were wrong.',
    'Watch me do {t} in real time — no cuts',
    'If you\'re doing {t}, you\'re one step from quitting. Do this instead.',
    'The {t} setup I\'d build if I started over today'
  ];

  var BEATS = [
    ['0:00–0:03  HOOK', 'Say the sharpest claim first. No intro, no name, no "hey guys".'],
    ['0:03–0:10  STAKES', 'Why they should care in one line. Name the cost of getting it wrong.'],
    ['0:10–0:35  PROOF', 'Show the screen. Real numbers, real clicks. This is the retention engine.'],
    ['0:35–0:50  TURN', 'The counter-intuitive bit — the thing they did not expect.'],
    ['0:50–1:00  CTA', 'One ask. Comment a keyword, or follow for part two. Never two asks.']
  ];

  function hooksFor(topic) {
    var t = U.clean(topic) || 'this';
    return U.pick(HOOKS, 3).map(function (h) { return h.replace(/\{t\}/g, t); });
  }

  /* ---- Briefings -------------------------------------------------------- */
  function revenueLine() {
    var r = D().revenue;
    return 'Revenue over the last seven days is ' + U.money(r.last7, P().currency) +
           ', ' + U.dirSpoken(r.delta7) + '. Monthly recurring sits at ' +
           U.money(r.mrr, P().currency) + '.';
  }

  function growthLine() {
    var g = D().growth;
    return 'We picked up ' + U.spoken(g.downloads7) + ' new downloads, ' +
           U.dirSpoken(g.delta7) + '. Trial conversion is ' + g.trialConversion +
           ' percent, churn ' + g.churn + ' percent.';
  }

  function contentLine() {
    var c = D().content;
    var top = c.platforms.slice().sort(function (a, b) { return b.views - a.views; })[0];
    return 'Content reached ' + U.spoken(c.views7) + ' views across ' + c.posts7 +
           ' posts, ' + U.dirSpoken(c.delta7) + '. ' + top.name +
           ' is carrying it with ' + U.spoken(top.views) + '.';
  }

  function handledLine() {
    var h = D().handled;
    if (!h.length) return 'Nothing needed handling today.';
    return 'I handled ' + h.length + ' things on my own. ' +
           h.slice(0, 2).map(function (x) { return x.text.replace(/\.$/, ''); }).join('. ') + '.';
  }

  function needsLine() {
    var n = D().needsYou;
    if (!n.length) return 'Nothing is waiting on you. You\'re clear.';
    return n.length + (n.length === 1 ? ' thing needs you. ' : ' things need you. ') +
           n.map(function (x) { return x.text.replace(/\.$/, ''); }).join('. ') + '.';
  }

  /* ---- The skill list --------------------------------------------------- */
  var LIST = [

    /* — control ———————————————————————————————————— */
    {
      id: 'stop',
      match: /\b(stop|shut up|be quiet|quiet|nevermind|never mind|cancel|go to sleep|stand down)\b/i,
      run: function () {
        JARVIS.voice.shutUp();
        return { say: '', toast: 'Standing by' };
      }
    },
    {
      id: 'help',
      match: /\b(what can you do|help|commands|what do you do|options)\b/i,
      run: function () {
        return {
          say: 'I can brief you on revenue, downloads and content, tell you what I handled, ' +
               'write hooks and scripts, and run your posting queue. The full list is on screen.',
          action: 'help'
        };
      }
    },
    {
      id: 'refresh',
      match: /\b(refresh|reload|update the (numbers|stats|data)|pull.*(latest|fresh))\b/i,
      run: function () {
        return { say: 'Pulling the latest numbers now.', action: 'refresh' };
      }
    },

    /* — the queue ————————————————————————————————— */
    {
      id: 'queueAdd',
      match: /\b(?:add|schedule|queue|post|line up)\b.*?\b(?:to|in)?\s*(?:the )?(?:queue|calendar)?\b.*/i,
      /* Guarded below — only fires when we can actually extract a subject. */
      test: function (line) {
        return /^(add|schedule|queue up|queue|line up|post)\b/i.test(line.trim()) &&
               /\b(about|on|saying|called|titled|:)\b|["“]/.test(line);
      },
      run: function (m, line) {
        var topic = line.replace(/^(add|schedule|queue up|queue|line up|post)\b/i, '')
                        .replace(/\b(a |an |the )?(post|video|short|reel|tiktok|clip)\b/ig, ' ')
                        .replace(/\bto (the )?(queue|calendar)\b/ig, ' ')
                        .replace(/^.*?\b(about|on|saying|called|titled)\b/i, '')
                        .replace(/["“”]/g, '')
                        .trim();
        topic = U.clean(topic);
        if (!topic) return { say: 'What should the post be about?' };

        var when = 'Unscheduled';
        if (/\btomorrow\b/i.test(line)) { when = 'Tomorrow'; topic = topic.replace(/\btomorrow\b/ig, '').trim(); }
        else if (/\btonight\b/i.test(line)) { when = 'Tonight'; topic = topic.replace(/\btonight\b/ig, '').trim(); }
        else if (/\btoday\b/i.test(line)) { when = 'Today'; topic = topic.replace(/\btoday\b/ig, '').trim(); }

        var tag = 'Draft';
        var plat = line.match(/\b(tiktok|instagram|youtube|reel|short)\b/i);
        if (plat) tag = plat[1].toLowerCase() === 'reel' ? 'Instagram'
                     : plat[1].toLowerCase() === 'short' ? 'YouTube'
                     : plat[1][0].toUpperCase() + plat[1].slice(1).toLowerCase();

        JARVIS.store.queueAdd(U.clean(topic), when, tag);
        JARVIS.store.logAdd('Queued: ' + U.clean(topic), 'ok');
        return {
          say: 'Added to the queue for ' + when.toLowerCase() + '. ' +
               'That\'s ' + JARVIS.store.queueOpen().length + ' posts lined up.',
          panel: 'queue',
          toast: 'Queued'
        };
      }
    },
    {
      id: 'queueRead',
      match: /\b(queue|what('s| is) (scheduled|next|coming|lined up|posting)|calendar|posting schedule|what am i posting)\b/i,
      run: function () {
        var q = JARVIS.store.queueOpen();
        if (!q.length) return { say: 'The queue is empty. Tell me what to line up.', panel: 'queue' };
        return {
          say: 'You have ' + q.length + (q.length === 1 ? ' post' : ' posts') + ' queued. Next up, ' +
               q[0].when.toLowerCase() + ': ' + q[0].text + '.',
          panel: 'queue'
        };
      }
    },
    {
      id: 'queueDone',
      match: /\b(mark.*(done|posted)|i posted|done with|posted it|shipped it)\b/i,
      run: function (m, line) {
        var what = line.replace(/^.*?\b(mark|i posted|done with|posted)\b/i, '')
                       .replace(/\b(as )?(done|posted)\b/ig, '').trim();
        var hit = JARVIS.store.queueDone(what);
        if (!hit) return { say: 'I couldn\'t find that one in the queue.', panel: 'queue' };
        JARVIS.store.logAdd('Marked posted: ' + hit.text, 'ok');
        return { say: 'Nice. Marked "' + hit.text + '" as posted.', panel: 'queue', toast: 'Marked posted' };
      }
    },

    /* — making things ————————————————————————————— */
    {
      id: 'hooks',
      match: /\b(hooks?|ideas? for|content ideas|titles?|angles?)\b/i,
      run: function (m, line) {
        var topic = line.replace(/^.*?\b(hooks?|ideas?|titles?|angles?)\b/i, '')
                        .replace(/^\s*(for|about|on)\s+/i, '')
                        .trim();
        topic = U.clean(topic);
        if (!topic) return { say: 'What topic? Say, hooks about shipping with AI.' };
        var hooks = hooksFor(topic);
        hooks.forEach(function (h) { JARVIS.store.ideaAdd(h); });
        return {
          say: 'Three angles on ' + topic + '. One. ' + hooks[0] + '. Two. ' + hooks[1] +
               '. Three. ' + hooks[2] + '. I saved all three to your ideas.',
          panel: 'ideas',
          toast: '3 hooks saved'
        };
      }
    },
    {
      id: 'script',
      match: /\b(script|outline|structure|storyboard|beats)\b/i,
      run: function (m, line) {
        var topic = U.clean(line.replace(/^.*?\b(script|outline|structure|storyboard|beats)\b/i, '')
                                .replace(/^\s*(for|about|on)\s+/i, ''));
        if (!topic) topic = 'your next video';
        var hook = hooksFor(topic)[0];
        JARVIS.store.ideaAdd('SCRIPT — ' + topic + ' — open with: ' + hook);
        return {
          say: 'Here\'s the shape. Open on the hook: ' + hook + '. ' +
               'Three seconds of stakes, twenty five seconds of screen proof with real numbers, ' +
               'then the counter-intuitive turn, then one call to action. Never two. ' +
               'Full beat sheet is on screen and saved to your ideas.',
          panel: 'ideas',
          beats: BEATS,
          toast: 'Script outline saved'
        };
      }
    },
    {
      id: 'remember',
      match: /\b(remember|make a note|note that|write (this )?down|jot|capture this)\b/i,
      run: function (m, line) {
        var what = U.clean(line.replace(/^.*?\b(remember|make a note|note that|write (this )?down|jot|capture this)\b/i, '')
                               .replace(/^\s*(to|that|this|down|about)\s+/i, ''));
        if (!what) return { say: 'Remember what?' };
        JARVIS.store.ideaAdd(what);
        return { say: 'Noted. ' + what, panel: 'ideas', toast: 'Saved to ideas' };
      }
    },
    {
      id: 'ideasRead',
      match: /\b(my ideas|read.*(ideas|notes)|what.*(ideas|notes)|idea list)\b/i,
      run: function () {
        var ideas = JARVIS.store.ideas();
        if (!ideas.length) return { say: 'Your idea list is empty.', panel: 'ideas' };
        return {
          say: 'You have ' + ideas.length + (ideas.length === 1 ? ' idea' : ' ideas') + '. Most recent: ' +
               ideas.slice(0, 3).map(function (i) { return i.text; }).join('. ') + '.',
          panel: 'ideas'
        };
      }
    },
    {
      id: 'remind',
      match: /\bremind me\b/i,
      run: function (m, line) {
        var what = U.clean(line.replace(/^.*?\bremind me\b/i, '').replace(/^\s*(to|about|that)\s+/i, ''));
        if (!what) return { say: 'Remind you to do what?' };
        JARVIS.store.remindAdd(what);
        return { say: 'I\'ll keep that in front of you. ' + what + '.', panel: 'ideas', toast: 'Reminder set' };
      }
    },

    /* — the money question ————————————————————————— */
    {
      id: 'briefing',
      match: /\b(brief|briefing|rundown|status report|catch me up|debrief|full (report|picture)|how are we doing|how('s| is) everything|what('s| is) up|state of (play|things))\b/i,
      run: function () {
        return {
          say: U.greeting() + '. ' + revenueLine() + ' ' + growthLine() + ' ' +
               contentLine() + ' ' + handledLine() + ' ' + needsLine(),
          panel: 'all'
        };
      }
    },
    {
      id: 'app',
      match: /\b(how('s| is) the app|app (doing|stats|performance)|how('s| is) (it|the product|the business) (doing|going)|numbers)\b/i,
      run: function () {
        return {
          say: 'Pulling up our app stats now. ' + revenueLine() + ' ' + growthLine(),
          panel: 'revenue'
        };
      }
    },
    {
      id: 'revenue',
      match: /\b(revenue|money|mrr|sales|earnings|income|how much did we (make|earn)|cash)\b/i,
      run: function () {
        var r = D().revenue;
        return {
          say: revenueLine() + ' That works out to ' + P().currency + r.arpu +
               ' per download.',
          panel: 'revenue'
        };
      }
    },
    {
      id: 'growth',
      match: /\b(downloads|installs|users|growth|sign ?ups|new customers|churn|conversion|retention)\b/i,
      run: function () { return { say: growthLine(), panel: 'growth' }; }
    },

    /* — content ————————————————————————————————— */
    {
      id: 'topPost',
      match: /\b(top|best|winning|highest) (post|video|performer|content)|what (worked|performed|popped)\b/i,
      run: function () {
        var t = D().content.top;
        return {
          say: 'Your best performer is "' + t.hook + '" on ' + t.platform +
               '. ' + U.spoken(t.views) + ' views and ' + U.spoken(t.saves) +
               ' saves. The save rate is the signal there — make a part two.',
          panel: 'content'
        };
      }
    },
    {
      id: 'platform',
      match: /\b(tiktok|instagram|youtube|twitter|\bx\b)\b/i,
      run: function (m, line) {
        var want = line.match(/tiktok|instagram|youtube|twitter|\bx\b/i)[0].toLowerCase();
        if (want === 'twitter') want = 'x';
        var hit = D().content.platforms.filter(function (p) {
          return p.name.toLowerCase() === want;
        })[0];
        if (!hit) return { say: 'I\'m not tracking that platform yet.' };
        var share = (hit.views / D().content.views7 * 100).toFixed(0);
        return {
          say: hit.name + ' did ' + U.spoken(hit.views) + ' views this week, ' +
               share + ' percent of your total reach.',
          panel: 'content'
        };
      }
    },
    {
      id: 'content',
      match: /\b(content|views|reach|posts|impressions|social|how did (the )?content)\b/i,
      run: function () { return { say: contentLine(), panel: 'content' }; }
    },

    /* — autonomy ————————————————————————————————— */
    {
      id: 'handled',
      match: /\b(what did you (do|handle|fix|resolve)|handled|anything automatic|on your own|what have you done)\b/i,
      run: function () {
        return { say: handledLine(), panel: 'handled' };
      }
    },
    {
      id: 'needsMe',
      match: /\b(needs? (me|you|my|a decision)|blocked|blockers|waiting on|anything i (need|should)|my attention|approve)\b/i,
      run: function () {
        return { say: needsLine(), panel: 'needs' };
      }
    },

    /* — pleasantries ————————————————————————————— */
    {
      id: 'time',
      match: /\b(what time|the time|what('s| is) the date|what day)\b/i,
      run: function () {
        var d = new Date();
        return {
          say: 'It\'s ' + U.clockTime(d) + ' on ' +
               d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + '.'
        };
      }
    },
    {
      id: 'thanks',
      match: /\b(thanks|thank you|cheers|appreciate|nice work|good job)\b/i,
      run: function () {
        return { say: U.pick([
          'Any time.',
          'That\'s what I\'m here for.',
          'Always a pleasure.',
          'Noted. Back to work.'
        ], 1)[0] };
      }
    },
    {
      id: 'hello',
      match: /\b(hello|hi|hey|good (morning|afternoon|evening)|you (there|awake|up)|wake up)\b/i,
      run: function () {
        var d = D();
        var owner = P().owner ? ', ' + P().owner : '';
        return {
          say: U.greeting() + owner + '. All systems are up. ' +
               'Revenue is ' + U.money(d.revenue.last7, P().currency) + ' over seven days and ' +
               d.needsYou.length + (d.needsYou.length === 1 ? ' item needs' : ' items need') +
               ' your call. Ask me for the full briefing when you\'re ready.'
        };
      }
    },
    {
      id: 'whoAreYou',
      match: /\b(who are you|what are you|your name)\b/i,
      run: function () {
        return {
          say: 'I\'m Jarvis. I watch the numbers, handle what I can, and tell you ' +
               'what actually needs you. Running locally in your browser.'
        };
      }
    }
  ];

  /* --- Dispatch ---------------------------------------------------------- */
  function run(line) {
    var text = U.clean(line);
    if (!text) return null;

    for (var i = 0; i < LIST.length; i++) {
      var s = LIST[i];
      var hit = s.test ? s.test(text) : s.match.test(text);
      if (!hit) continue;
      var m = s.match ? text.match(s.match) : null;
      var out = s.run(m, text) || {};
      out.id = s.id;
      return out;
    }

    /* Nothing matched. Say so plainly rather than inventing an answer. */
    return {
      id: 'unknown',
      say: U.pick([
        'I didn\'t catch a command in that. Ask me for the briefing, or say what can you do.',
        'That one\'s not in my skill list yet. Try: how\'s the app doing.',
        'I\'m not wired for that yet. Say help for what I can actually do.'
      ], 1)[0],
      unknown: true
    };
  }

  return {
    run: run,
    list: LIST,
    hooksFor: hooksFor,
    beats: BEATS,
    /* Add your own at runtime: JARVIS.skills.add({id, match, run}) */
    add: function (skill, atTop) {
      if (atTop) LIST.unshift(skill); else LIST.push(skill);
    }
  };
})();
