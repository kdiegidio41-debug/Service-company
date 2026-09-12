/* =========================================================================
   JARVIS — skills
   -------------------------------------------------------------------------
   A skill is { id, match | test, run }. First match wins, so specific
   skills sit above general ones. The logging skills come first: "log 250
   revenue" must not be caught by the skill that reads revenue back.

   Voice register: composed and brief. State the number, state the change,
   stop. No filler, no exclamation, no congratulating the user on their own
   data.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.skills = (function () {
  'use strict';

  var U = JARVIS.util;
  var S = JARVIS.store;

  function D() { return JARVIS.data.get(); }
  function P() { return S.profile(); }
  function cur() { return P().currency || '$'; }

  function platformFrom(line) {
    var m = line.match(/\b(tiktok|instagram|insta|reels?|youtube|shorts?|twitter|\bx\b)\b/i);
    if (!m) return null;
    var w = m[1].toLowerCase();
    if (/insta|reel/.test(w)) return 'Instagram';
    if (/youtube|short/.test(w)) return 'YouTube';
    if (/twitter|^x$/.test(w)) return 'X';
    return 'TikTok';
  }

  /* ---- Hook / script templates (offline, no model) ---------------------- */
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

  /* ---- Spoken lines ----------------------------------------------------- */
  function revenueLine() {
    var r = D().revenue;
    if (!r.last7 && !r.mrr) {
      return 'No revenue logged in the last seven days. Say, log two hundred revenue, to start the record.';
    }
    var parts = ['Revenue over the last seven days is ' + U.money(r.last7, cur()) +
                 ', ' + U.dirSpoken(r.delta7) + '.'];
    if (r.mrr) parts.push('Monthly recurring is ' + U.money(r.mrr, cur()) + '.');
    return parts.join(' ');
  }

  function growthLine() {
    var g = D().growth;
    if (!g.downloads7 && !g.activeUsers) {
      return 'No downloads logged this week.';
    }
    var parts = [];
    if (g.downloads7) {
      parts.push(U.spoken(g.downloads7) + ' new downloads, ' + U.dirSpoken(g.delta7) + '.');
    }
    if (g.activeUsers) parts.push(U.spoken(g.activeUsers) + ' active users.');
    if (g.trialConversion) parts.push('Trial conversion ' + g.trialConversion + ' percent.');
    if (g.churn) parts.push('Churn ' + g.churn + ' percent.');
    return parts.join(' ');
  }

  function contentLine() {
    var c = D().content;
    if (!c.views7) {
      return 'No views logged this week. Say, log twelve thousand views on TikTok, when you have them.';
    }
    var top = c.platforms.slice().sort(function (a, b) { return b.views - a.views; })[0];
    var line = 'Content reached ' + U.spoken(c.views7) + ' views';
    if (c.posts7) line += ' across ' + c.posts7 + (c.posts7 === 1 ? ' post' : ' posts');
    line += ', ' + U.dirSpoken(c.delta7) + '.';
    if (top && top.views) line += ' ' + top.name + ' leads with ' + U.spoken(top.views) + '.';
    return line;
  }

  function handledLine() {
    var h = D().handled;
    if (!h.length) return 'Nothing logged as handled yet.';
    return h.length + (h.length === 1 ? ' item handled. ' : ' items handled. ') +
           h.slice(0, 3).map(function (x) { return x.text.replace(/\.$/, ''); }).join('. ') + '.';
  }

  function needsLine() {
    var n = D().needsYou;
    if (!n.length) return 'Nothing is waiting on you.';
    return n.length + (n.length === 1 ? ' item needs you. ' : ' items need you. ') +
           n.map(function (x) { return x.text.replace(/\.$/, ''); }).join('. ') + '.';
  }

  function emptyBriefing() {
    return U.greeting() + '. The console is live and the ledger is empty — ' +
           'nothing has been logged yet, so every figure reads zero. ' +
           'Start by saying, log two hundred revenue, or open settings to enter your ' +
           'baseline numbers. Once there is data here, ask me for the briefing again.';
  }

  /* ---- The skill list --------------------------------------------------- */
  var LIST = [

    /* — control ———————————————————————————————————— */
    {
      id: 'stop',
      match: /\b(stop|shut up|be quiet|quiet|nevermind|never mind|cancel|go to sleep|stand down)\b/i,
      run: function () { JARVIS.voice.shutUp(); return { say: '', toast: 'Standing by' }; }
    },
    {
      id: 'settings',
      match: /\b(settings|preferences|configure|set ?up|edit (my )?data|enter (my )?numbers|options)\b/i,
      run: function () {
        return { say: 'Opening settings.', action: 'settings' };
      }
    },
    {
      id: 'help',
      match: /\b(what can you do|help|commands|what do you do)\b/i,
      run: function () {
        return {
          say: 'I track revenue, growth and content from what you log, run your posting queue, ' +
               'and hold your notes. The full command list is on screen.',
          action: 'help'
        };
      }
    },
    {
      id: 'refresh',
      match: /\b(refresh|reload|recalculate|update the (numbers|stats|data))\b/i,
      run: function () { return { say: 'Recalculating.', action: 'refresh' }; }
    },

    /* — agents ————————————————————————————————— */
    {
      id: 'runAgents',
      match: /\b(run the agents?|run agents?|check everything|scan|sweep|run the watchers?|any issues)\b/i,
      run: function () {
        var report = JARVIS.agents.runAll();
        return {
          say: JARVIS.agents.describe(report),
          panel: 'needs',
          toast: report.added ? report.added + ' new' : 'All clear'
        };
      }
    },
    {
      id: 'agentList',
      match: /\b(what agents|which agents|list agents|your agents|who('s| is) watching)\b/i,
      run: function () {
        var on = JARVIS.agents.list().filter(function (a) { return a.enabled; });
        return {
          say: on.length + ' watchers are on: ' +
               on.map(function (a) { return a.name; }).join(', ') +
               '. They run over your own logged data — no model, no cost.' +
               (JARVIS.brain.available()
                 ? ' The thinking agents are connected too: ask me to strategise.'
                 : ' Connect a proxy to add the thinking agents.'),
          action: 'settings'
        };
      }
    },
    {
      id: 'strategist',
      match: /\b(strateg(y|ise|ize)|what should i (do|focus|work on)|advise me|the plan|game ?plan|what('s| is) the play)\b/i,
      run: function () {
        if (!JARVIS.brain.available()) {
          return {
            say: 'The strategist needs a connected proxy with an Anthropic key. ' +
                 'The watchers work without one — say, run the agents.',
            action: 'settings'
          };
        }
        if (JARVIS.data.isEmpty()) {
          return { say: 'There is nothing logged for it to reason about yet.' };
        }
        return { thinking: 'strategist', panel: 'all' };
      }
    },
    {
      id: 'smartBriefing',
      match: /\b(proper briefing|real briefing|full briefing|brief me properly)\b/i,
      run: function () {
        if (!JARVIS.brain.available()) {
          return { say: 'That needs a connected proxy. Say, brief me, for the standard briefing.' };
        }
        return { thinking: 'briefing', panel: 'all' };
      }
    },

    /* — logging: this is how data gets in ——————————————— */
    {
      id: 'logRevenue',
      test: function (l) {
        return /\b(log|add|record|book|made|earned|took)\b/i.test(l) &&
               /\b(revenue|sales?|dollars?|bucks|income|earnings|mrr|\$)/i.test(l) &&
               !/\bset\b/i.test(l) && U.parseNum(l) !== null;
      },
      run: function (m, line) {
        var n = U.parseNum(line);
        if (n === null) return { say: 'How much?' };
        var total = S.addRevenue(n);
        S.logAdd('Logged ' + U.money(n, cur()) + ' revenue', 'ok');
        return {
          say: 'Logged ' + U.money(n, cur()) + '. That puts today at ' +
               U.money(total, cur()) + ', and the last seven days at ' +
               U.money(D().revenue.last7, cur()) + '.',
          panel: 'revenue', toast: 'Revenue logged'
        };
      }
    },
    {
      id: 'logDownloads',
      test: function (l) {
        return /\b(log|add|record|got|had)\b/i.test(l) &&
               /\b(downloads?|installs?|sign ?ups?|new users?)\b/i.test(l) &&
               !/\bset\b/i.test(l) && U.parseNum(l) !== null;
      },
      run: function (m, line) {
        var n = U.parseNum(line);
        if (n === null) return { say: 'How many?' };
        S.addDownloads(Math.round(n));
        return {
          say: 'Logged ' + U.commas(n) + ' downloads. Seven day total is ' +
               U.commas(D().growth.downloads7) + '.',
          panel: 'growth', toast: 'Downloads logged'
        };
      }
    },
    {
      id: 'logViews',
      test: function (l) {
        return /\b(log|add|record|got|had)\b/i.test(l) &&
               /\b(views?|impressions?|reach)\b/i.test(l) &&
               !/\bset\b/i.test(l) && U.parseNum(l) !== null;
      },
      run: function (m, line) {
        var n = U.parseNum(line);
        if (n === null) return { say: 'How many views?' };
        var plat = platformFrom(line) || 'TikTok';
        S.addViews(Math.round(n), plat);
        return {
          say: 'Logged ' + U.spoken(n) + ' views on ' + plat + '. ' +
               'Seven day reach is ' + U.spoken(D().content.views7) + '.',
          panel: 'content', toast: 'Views logged'
        };
      }
    },
    {
      id: 'setMetric',
      test: function (l) {
        return /\bset\b/i.test(l) &&
               /\b(mrr|recurring|followers?|active users?|actives?|conversion|churn|name|currency)\b/i.test(l);
      },
      run: function (m, line) {
        var n = U.parseNum(line.replace(/\bset\b/i, ''));

        if (/\b(name)\b/i.test(line)) {
          var nm = U.clean(line.replace(/.*\bname\s*(to|as|is)?\s*/i, ''));
          if (!nm) return { say: 'What should I call it?' };
          S.setProfile({ name: nm });
          return { say: 'Noted. I\'ll refer to it as ' + nm + '.', toast: 'Name set' };
        }
        if (n === null) return { say: 'What value?' };

        if (/\b(mrr|recurring)\b/i.test(line)) {
          S.setProfile({ mrr: n });
          return { say: 'Monthly recurring set to ' + U.money(n, cur()) + '.', panel: 'revenue', toast: 'MRR set' };
        }
        if (/\bfollowers?\b/i.test(line)) {
          S.setProfile({ followers: Math.round(n) });
          return { say: 'Followers set to ' + U.commas(n) + '.', panel: 'content', toast: 'Followers set' };
        }
        if (/\bactives?\b|\bactive users?\b/i.test(line)) {
          S.setProfile({ activeUsers: Math.round(n) });
          return { say: 'Active users set to ' + U.commas(n) + '.', panel: 'growth', toast: 'Active users set' };
        }
        if (/\bconversion\b/i.test(line)) {
          S.setProfile({ trialConversion: n });
          return { say: 'Trial conversion set to ' + n + ' percent.', panel: 'growth', toast: 'Conversion set' };
        }
        if (/\bchurn\b/i.test(line)) {
          S.setProfile({ churn: n });
          return { say: 'Churn set to ' + n + ' percent.', panel: 'growth', toast: 'Churn set' };
        }
        return { say: 'I didn\'t catch which figure to set.' };
      }
    },
    {
      id: 'logPost',
      test: function (l) {
        return /^(published|posted|log a post|log post|went live with)\b/i.test(l.trim());
      },
      run: function (m, line) {
        var plat = platformFrom(line) || 'TikTok';
        var views = U.parseNum(line);
        var hook = U.clean(line
          .replace(/^(published|posted|log a post|log post|went live with)\b/i, '')
          .replace(/\bon (tiktok|instagram|insta|reels?|youtube|shorts?|twitter|x)\b/ig, '')
          .replace(/\bwith\b.*$/i, '')
          .replace(/["""]/g, ''));
        if (!hook) return { say: 'What was the post?' };
        S.postAdd(hook, plat, views ? Math.round(views) : 0, 0);
        return {
          say: 'Recorded "' + hook + '" on ' + plat + '.',
          panel: 'content', toast: 'Post recorded'
        };
      }
    },
    {
      id: 'handledAdd',
      test: function (l) {
        return /^(handled|i fixed|fixed|i shipped|shipped|i handled|done:|log that i)\b/i.test(l.trim());
      },
      run: function (m, line) {
        var what = U.clean(line.replace(/^(handled|i fixed|fixed|i shipped|shipped|i handled|done:|log that i)\b/i, ''));
        if (!what) return { say: 'Handled what?' };
        S.handledAdd(what, 'ok');
        return { say: 'Logged as handled.', panel: 'handled', toast: 'Logged' };
      }
    },
    {
      id: 'needsAdd',
      test: function (l) {
        return /^(flag|blocker|i need to|need to|todo|to do|chase|waiting on)\b/i.test(l.trim());
      },
      run: function (m, line) {
        var what = U.clean(line.replace(/^(flag|blocker|i need to|need to|todo|to do|chase|waiting on)\b/i, ''));
        if (!what) return { say: 'Flag what?' };
        var kind = /\b(urgent|critical|overdue|dispute|rejected?)\b/i.test(what) ? 'bad' : 'warn';
        S.needsAdd(what, kind);
        return {
          say: 'Flagged. ' + D().needsYou.length +
               (D().needsYou.length === 1 ? ' item needs you.' : ' items need you.'),
          panel: 'needs', toast: 'Flagged'
        };
      }
    },
    {
      id: 'needsResolve',
      test: function (l) { return /^(resolved|cleared|sorted|took care of)\b/i.test(l.trim()); },
      run: function (m, line) {
        var what = U.clean(line.replace(/^(resolved|cleared|sorted|took care of)\b/i, ''));
        var hit = S.needsResolve(what);
        if (!hit) return { say: 'I couldn\'t find that on the list.', panel: 'needs' };
        return { say: 'Cleared. Moved to handled.', panel: 'needs', toast: 'Resolved' };
      }
    },

    /* — content ops ————————————————————————————————— */
    {
      id: 'queueAdd',
      test: function (line) {
        return /^(add|schedule|queue up|queue|line up|post)\b/i.test(line.trim()) &&
               /\b(about|on|saying|called|titled|:)\b|["""]/.test(line);
      },
      run: function (m, line) {
        var topic = line.replace(/^(add|schedule|queue up|queue|line up|post)\b/i, '')
                        .replace(/\b(a |an |the )?(post|video|short|reel|tiktok|clip)\b/ig, ' ')
                        .replace(/\bto (the )?(queue|calendar)\b/ig, ' ')
                        .replace(/^.*?\b(about|on|saying|called|titled)\b/i, '')
                        .replace(/["""]/g, '')
                        .trim();
        topic = U.clean(topic);
        if (!topic) return { say: 'What should the post be about?' };

        var when = 'Unscheduled';
        if (/\btomorrow\b/i.test(line)) { when = 'Tomorrow'; topic = topic.replace(/\btomorrow\b/ig, '').trim(); }
        else if (/\btonight\b/i.test(line)) { when = 'Tonight'; topic = topic.replace(/\btonight\b/ig, '').trim(); }
        else if (/\btoday\b/i.test(line)) { when = 'Today'; topic = topic.replace(/\btoday\b/ig, '').trim(); }

        var tag = platformFrom(line) || 'Draft';
        S.queueAdd(U.clean(topic), when, tag);
        S.logAdd('Queued: ' + U.clean(topic), 'ok');
        return {
          say: 'Queued for ' + when.toLowerCase() + '. ' +
               S.queueOpen().length + ' posts lined up.',
          panel: 'queue', toast: 'Queued'
        };
      }
    },
    {
      id: 'queueRead',
      match: /\b(queue|what('s| is) (scheduled|next|coming|lined up|posting)|calendar|posting schedule|what am i posting)\b/i,
      run: function () {
        var q = S.queueOpen();
        if (!q.length) return { say: 'The queue is empty.', panel: 'queue' };
        return {
          say: q.length + (q.length === 1 ? ' post queued. Next, ' : ' posts queued. Next, ') +
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
        var hit = S.queueDone(what);
        if (!hit) return { say: 'I couldn\'t find that in the queue.', panel: 'queue' };
        S.logAdd('Marked posted: ' + hit.text, 'ok');
        return { say: 'Marked "' + hit.text + '" as posted.', panel: 'queue', toast: 'Marked posted' };
      }
    },
    {
      id: 'hooks',
      match: /\b(hooks?|ideas? for|content ideas|titles?|angles?)\b/i,
      run: function (m, line) {
        var topic = U.clean(line.replace(/^.*?\b(hooks?|ideas?|titles?|angles?)\b/i, '')
                                .replace(/^\s*(for|about|on)\s+/i, ''));
        if (!topic) return { say: 'What topic?' };
        /* A connected proxy writes these against your actual top performer;
           without one they come from templates. */
        if (JARVIS.brain.available()) return { thinking: 'hooks', topic: topic, panel: 'ideas' };
        var hooks = hooksFor(topic);
        hooks.forEach(function (h) { S.ideaAdd(h); });
        return {
          say: 'Three angles on ' + topic + '. One. ' + hooks[0] + '. Two. ' + hooks[1] +
               '. Three. ' + hooks[2] + '. All three saved to your ideas.',
          panel: 'ideas', toast: '3 hooks saved'
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
        if (JARVIS.brain.available()) return { thinking: 'script', topic: topic, panel: 'ideas' };
        var hook = hooksFor(topic)[0];
        S.ideaAdd('SCRIPT — ' + topic + ' — open with: ' + hook);
        return {
          say: 'Open on the hook: ' + hook + '. Three seconds of stakes, ' +
               'twenty five seconds of screen proof with real numbers, then the ' +
               'counter-intuitive turn, then one call to action. The beat sheet is on screen.',
          panel: 'ideas', beats: BEATS, toast: 'Outline saved'
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
        S.ideaAdd(what);
        return { say: 'Noted. ' + what, panel: 'ideas', toast: 'Saved' };
      }
    },
    {
      id: 'ideasRead',
      match: /\b(my ideas|read.*(ideas|notes)|what.*(ideas|notes)|idea list)\b/i,
      run: function () {
        var ideas = S.ideas();
        if (!ideas.length) return { say: 'Your idea list is empty.', panel: 'ideas' };
        return {
          say: ideas.length + (ideas.length === 1 ? ' idea. ' : ' ideas. Most recent: ') +
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
        S.remindAdd(what);
        return { say: 'I\'ll keep it in front of you.', panel: 'ideas', toast: 'Reminder set' };
      }
    },

    /* — reading the numbers back ————————————————————— */
    {
      id: 'briefing',
      match: /\b(brief|briefing|rundown|status report|catch me up|debrief|full (report|picture)|how are we doing|how('s| is) everything|what('s| is) up|state of (play|things))\b/i,
      run: function () {
        if (JARVIS.data.isEmpty()) return { say: emptyBriefing(), action: 'settings' };
        return {
          say: U.greeting() + '. ' + revenueLine() + ' ' + growthLine() + ' ' +
               contentLine() + ' ' + handledLine() + ' ' + needsLine(),
          panel: 'all'
        };
      }
    },
    {
      id: 'app',
      match: /\b(how('s| is) the app|app (doing|stats|performance)|how('s| is) (it|the product|the business) (doing|going)|the numbers)\b/i,
      run: function () {
        if (JARVIS.data.isEmpty()) return { say: emptyBriefing(), action: 'settings' };
        return { say: revenueLine() + ' ' + growthLine(), panel: 'revenue' };
      }
    },
    {
      id: 'revenue',
      match: /\b(revenue|money|mrr|sales|earnings|income|how much did we (make|earn)|cash)\b/i,
      run: function () {
        var r = D().revenue;
        var line = revenueLine();
        if (r.arpu) line += ' That is ' + cur() + r.arpu + ' per download.';
        return { say: line, panel: 'revenue' };
      }
    },
    {
      id: 'growth',
      match: /\b(downloads|installs|users|growth|sign ?ups|new customers|churn|conversion|retention)\b/i,
      run: function () { return { say: growthLine(), panel: 'growth' }; }
    },
    {
      id: 'topPost',
      match: /\b(top|best|winning|highest) (post|video|performer|content)|what (worked|performed|popped)\b/i,
      run: function () {
        var t = D().content.top;
        if (!t) return {
          say: 'No posts recorded yet. Say, published, then the hook, to add one.',
          panel: 'content'
        };
        var line = 'Your best performer is "' + t.hook + '" on ' + t.platform + '.';
        if (t.views) line += ' ' + U.spoken(t.views) + ' views.';
        if (t.saves) line += ' ' + U.spoken(t.saves) + ' saves.';
        return { say: line, panel: 'content' };
      }
    },
    {
      id: 'platform',
      match: /\b(tiktok|instagram|youtube|twitter|\bx\b)\b/i,
      run: function (m, line) {
        var want = platformFrom(line);
        var hit = D().content.platforms.filter(function (p) { return p.name === want; })[0];
        if (!hit) return { say: 'I\'m not tracking that platform.' };
        if (!hit.views) return { say: 'No views logged on ' + hit.name + ' this week.', panel: 'content' };
        var share = (hit.views / D().content.views7 * 100).toFixed(0);
        return {
          say: hit.name + ' did ' + U.spoken(hit.views) + ' views this week, ' +
               share + ' percent of your reach.',
          panel: 'content'
        };
      }
    },
    {
      id: 'content',
      match: /\b(content|views|reach|posts|impressions|social)\b/i,
      run: function () { return { say: contentLine(), panel: 'content' }; }
    },
    {
      id: 'handled',
      match: /\b(what did you (do|handle|fix|resolve)|handled|what have you done)\b/i,
      run: function () { return { say: handledLine(), panel: 'handled' }; }
    },
    {
      id: 'needsMe',
      match: /\b(needs? (me|you|my|a decision)|blocked|blockers|waiting on|anything i (need|should)|my attention|open items)\b/i,
      run: function () { return { say: needsLine(), panel: 'needs' }; }
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
        return { say: U.pick(['Of course.', 'Any time.', 'Noted.'], 1)[0] };
      }
    },
    {
      id: 'hello',
      match: /\b(hello|hi|hey|good (morning|afternoon|evening)|you (there|awake|up)|wake up)\b/i,
      run: function () {
        var d = D();
        var owner = P().owner ? ', ' + P().owner : '';
        if (JARVIS.data.isEmpty()) {
          return { say: U.greeting() + owner + '. Systems are up and the ledger is empty. Ask me for the briefing when you\'re ready.' };
        }
        return {
          say: U.greeting() + owner + '. Systems are up. Revenue is ' +
               U.money(d.revenue.last7, cur()) + ' over seven days and ' +
               d.needsYou.length + (d.needsYou.length === 1 ? ' item needs' : ' items need') +
               ' your attention.'
        };
      }
    },
    {
      id: 'whoAreYou',
      match: /\b(who are you|what are you|your name)\b/i,
      run: function () {
        return {
          say: 'I\'m Jarvis. I hold your numbers, your queue and your notes, ' +
               'and I report on them. Running locally, on your machine.'
        };
      }
    }
  ];

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

    return {
      id: 'unknown',
      say: U.pick([
        'That isn\'t a command I hold. Say, help, for the list.',
        'Not in my skill set yet. Try, brief me.',
        'I didn\'t find a command in that.'
      ], 1)[0],
      unknown: true
    };
  }

  return {
    run: run,
    list: LIST,
    hooksFor: hooksFor,
    beats: BEATS,
    add: function (skill, atTop) { if (atTop) LIST.unshift(skill); else LIST.push(skill); }
  };
})();
