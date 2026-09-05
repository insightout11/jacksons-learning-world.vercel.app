/* ============ MISSION-GENERATION PIPELINE (service boundary) ============
   YouTube URL → metadata → transcript → analysis → age adaptation
   → generation → validation → parent preview/edit → approval → child mission

   PROVENANCE (never misrepresented):
   - 'retrieved'        : actually fetched from an external service this run
   - 'seeded-transcript': stored verbatim transcript text bundled for demo
   - 'retrieved-description': real channel/description text gathered at curation
   - 'curated-brief'    : human-written brief for a known video (NOT transcript)
   - 'demo'             : fully synthetic fallback so the app works offline
   In this local build there is no transcript API key, so live retrieval is
   stubbed and every output is labeled with its true provenance. */
const PROV_LABEL = {
  'retrieved':'🟢 Retrieved live',
  'seeded-transcript':'🟡 Seeded transcript',
  'retrieved-description':'🟡 Video description',
  'curated-brief':'🟠 Curated brief',
  'demo':'⚪ Demo synthesis'
};

/* Verbatim transcript segments retrieved during curation (bridges). */
const SEEDED_TRANSCRIPTS = {
  'oVOnRPefcno':{ provenance:'seeded-transcript', source:'SciShow Kids “What Makes Bridges So Strong?” (retrieved transcript excerpt)', segments:[
    {t:null, text:'A SciShow Kids viewer wrote us to ask how bridges are strong enough to carry cars and trucks!'},
    {t:null, text:'Take the world’s busiest bridge, the George Washington Bridge in New York City. Look at all those cars and trucks! For a bridge to carry that much weight, it has to be built of special material, like iron and steel. But it takes more than tough materials to make a strong bridge.'},
    {t:null, text:'One very simple kind of bridge is called a beam bridge. A beam bridge can be just a log that you use to walk across a stream. All bridges can hold a certain amount of weight, but what happens if we put too much weight on a beam bridge? It collapses.'}
  ]}
};
/* Real publisher descriptions gathered at curation time (shortened). */
const RETRIEVED_DESCRIPTIONS = {
  'K7Oq9_DU1Mc':{provenance:'retrieved-description', source:'SciShow Kids video description', text:'Jessi and Squeaks explore nature’s way of letting off steam: volcanoes — how they form and how eruptions happen.'},
  'VLpSxHwfU04':{provenance:'retrieved-description', source:'SciShow Kids video description', text:'Squeaks prepares for a plane trip; Jessi teaches the science behind how airplanes fly: wings, lift, air pressure, engines, thrust.'},
  'oXwoy-Ce1ZE':{provenance:'retrieved-description', source:'SciShow Kids video description', text:'Jessi, Squeaks and Dino solve a science mystery: what happened to the dinosaurs — asteroid impact, key moment 1:28.'},
  '9klE-iUxX0c':{provenance:'retrieved-description', source:'TED-Ed lesson “Run, sail, or hide?”', text:'Siblings Fabia, Lucius and Marcus attempt to survive the destruction of Pompeii as Vesuvius spews smoke, ash and rock.'},
  'tj-4WeOXKco':{provenance:'retrieved-description', source:'Bedtime History video description', text:'Roman aqueducts carried fresh water from faraway springs into cities using gravity through channels, tunnels and tall stone arches — for drinking, bathing, fountains.'},
  'cf-JUz3gqdk':{provenance:'retrieved-description', source:'SciShow Kids “How Will Humans Live on Mars?”', text:'Exploring what humans need to live on Mars: air, water, shelter, food.'},
  'my4_gpefD7w':{provenance:'retrieved-description', source:'SciShow Kids “How Sharks Find Food With Electricity!”', text:'Sharks sense the tiny electric fields of hidden animals — an amazing animal sense.'},
  'eXiVGEEPQ6c':{provenance:'retrieved-description', source:'Peekaboo Kidz “Structure Of The Earth”', text:'Earth is made of distinct layers — crust, mantle, core — each with its own properties.'},
  'koota_lwU_4':{provenance:'retrieved-description', source:'SciShow Kids “Mary Anning: Fossil Hunter”', text:'The story of fossil hunter Mary Anning and how fossils teach us about ancient life.'},
  '4Bp4MgmT0Co':{provenance:'retrieved-description', source:'SciShow Kids “How Do Animal Wings Work?”', text:'The science of flight in animals: how wings push air to make lift.'}
};

const PipelineService = {
  async run(url, opts){
    const log = [];
    const step = (stage, detail, prov)=>{ log.push({stage, detail, prov:prov||null, at:Date.now()}); };
    step('url', 'Parsing YouTube URL…');
    const parsed = parseYouTubeUrl(url);
    if(!parsed.ok){ step('url', 'Rejected: '+parsed.error); return {ok:false, error:parsed.error, log}; }
    const videoId = parsed.videoId;
    step('url', 'Video ID: '+videoId);
    step('metadata', 'Fetching title/channel…');
    const meta = await MetadataService.get(videoId);
    step('metadata', meta.title+' · '+meta.channel, meta.provenance);
    step('transcript', 'Retrieving captions…');
    const tr = await TranscriptService.get(videoId);
    step('transcript', tr.note, tr.provenance);
    step('analysis', 'Extracting concepts…');
    const analysis = AnalysisService.analyze(meta, tr);
    step('analysis', analysis.concepts.join(', ')||'general curiosity');
    step('adapt', 'Adapting for age '+(opts&&opts.age||6)+'…');
    const adapted = AgeAdapter.adapt(analysis, (opts&&opts.age)||6);
    step('adapt', adapted.readingNote);
    step('generate', 'Drafting prediction, activities, creative, rabbit holes…');
    const draft = MissionCrafter.craft(meta, tr, adapted, opts||{});
    step('generate', draft.questions.length+' activities · provenance: '+draft.provenance, draft.provenance);
    step('validate', 'Checking quality rules…');
    const report = MissionValidator.check(draft);
    step('validate', report.issues.length? report.issues.join(' | ') : 'Passed all checks');
    return {ok:report.pass, draft, log, report};
  }
};

const MetadataService = {
  async get(videoId){
    try{
      const ctrl = new AbortController(); const to = setTimeout(()=>ctrl.abort(), 6000);
      const res = await fetch('https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+videoId)+'&format=json', {signal:ctrl.signal});
      clearTimeout(to);
      if(res.ok){ const j = await res.json();
        return {videoId, title:j.title||('Video '+videoId), channel:(j.author_name||'YouTube').replace(/ - YouTube$/,''), thumb:ytThumb(videoId), provenance:'retrieved'};
      }
    }catch(e){}
    const known = KNOWN_VIDEOS[videoId];
    if(known) return {videoId, title:known.title, channel:known.channel, thumb:ytThumb(videoId), provenance:'retrieved-description'};
    return {videoId, title:'New Discovery', channel:'YouTube', thumb:ytThumb(videoId), provenance:'demo'};
  }
};
const KNOWN_VIDEOS = {
  'K7Oq9_DU1Mc':{title:'All About Volcanoes', channel:'SciShow Kids'},
  'VLpSxHwfU04':{title:'How Airplanes Fly!', channel:'SciShow Kids'},
  'oVOnRPefcno':{title:'What Makes Bridges So Strong?', channel:'SciShow Kids'},
  'oXwoy-Ce1ZE':{title:'What Happened to the Dinosaurs?', channel:'SciShow Kids'},
  'nx7-tPP4ZrQ':{title:'How Do Engineers Build the Tallest Skyscrapers?', channel:'School Studies'},
  '9klE-iUxX0c':{title:'Run, sail, or hide? Surviving Pompeii', channel:'TED-Ed'},
  '01I8gH9ff0E':{title:'Volcanic Islands', channel:'Explore Planet English'},
  'cf-JUz3gqdk':{title:'How Will Humans Live on Mars?', channel:'SciShow Kids'},
  'my4_gpefD7w':{title:'How Sharks Find Food With Electricity!', channel:'SciShow Kids'},
  'JfOMZfxH4ME':{title:'How Does YOUR Car’s Engine Work?!', channel:'KLT'},
  'tj-4WeOXKco':{title:'Roman Aqueducts', channel:'Bedtime History'},
  'koota_lwU_4':{title:'Mary Anning: Fossil Hunter', channel:'SciShow Kids'},
  'eXiVGEEPQ6c':{title:'Structure Of The Earth', channel:'Peekaboo Kidz'},
  '4Bp4MgmT0Co':{title:'How Do Animal Wings Work?', channel:'SciShow Kids'},
  'ZLDUrPaLQWE':{title:'Push and Pull for Kids', channel:'Homeschool Pop'}
};

const TranscriptService = {
  async get(videoId){
    /* No caption API key in this environment — live retrieval stubbed. */
    if(SEEDED_TRANSCRIPTS[videoId]){
      const s = SEEDED_TRANSCRIPTS[videoId];
      return {status:'seeded', provenance:s.provenance, segments:s.segments, note:s.segments.length+' verbatim segments (stored demo copy)'};
    }
    if(RETRIEVED_DESCRIPTIONS[videoId]){
      const d = RETRIEVED_DESCRIPTIONS[videoId];
      return {status:'described', provenance:d.provenance, segments:[{t:null, text:d.text}], note:'No caption API — using publisher description ('+d.source+')'};
    }
    return {status:'unavailable', provenance:'demo', segments:[], note:'No captions available offline — demo synthesis fallback'};
  }
};

const AnalysisService = {
  analyze(meta, tr){
    const text = ((meta.title||'')+' '+tr.segments.map(s=>s.text).join(' ')).toLowerCase();
    const bank = ['magma','lava','lift','thrust','gravity','fossil','asteroid','arch','truss','engine','magnet','electric','wing','aqueduct','volcano','mars','shark','bridge','roman','core','mantle','crust','push','pull','force'];
    const concepts = bank.filter(c=>text.includes(c)).slice(0,6);
    return {concepts, hasTranscript:tr.segments.length>0, provenance:tr.provenance};
  }
};
const AgeAdapter = {
  adapt(analysis, age){
    return {age, readingNote:'Short instructions · visual answers · minimal typing · draw/voice welcome',
      maxChoices:3, preferVisual:true, allowTyping:age>=7};
  }
};

const MissionCrafter = {
  craft(meta, tr, adapted, opts){
    const title = (opts.titleHint)||meta.title||'New Discovery';
    const prov = tr.provenance;
    const concept = (tr.segments[0]&&tr.segments[0].text)||meta.title;
    const questions = [
      {kind:'mc', q:'What was the most surprising idea in the video?', options:['Something about how things work','Nothing at all','I skipped it'], answer:0,
        why:'Curious watchers always find one surprising idea!', sourceConcept:'engagement', sourceExcerpt:String(concept).slice(0,140), sourceProvenance:prov},
      {kind:'mc', q:'What do you want to find out NEXT?', options:['Why does it happen?','What color is it?','Nothing — I’m done'], answer:0,
        why:'That “what next?” feeling is exactly what rabbit holes are made of!', sourceConcept:'curiosity', sourceExcerpt:String(concept).slice(0,140), sourceProvenance:prov},
      {kind:'tf', q:'True or false: Asking questions while you watch helps you remember more.', options:['True','False'], answer:0,
        why:'True! Scientists call it active watching.', sourceConcept:'metacognition', sourceProvenance:'demo'}
    ];
    return {
      id:'gen-'+Date.now(), title, theme:'discovery', zone:'home', type:'discovery', emoji:'🎬',
      grad:'linear-gradient(135deg,#a5b4fc,#6d28d9)', duration:'10 min', xp:130, coins:35,
      collectible:{name:'Premiere Ticket', emoji:'🎟️'}, worldItem:{name:'Screening Corner', emoji:'🎬'},
      desc:'Created from a parent-shared video: '+meta.title,
      media:{type:'youtube', youtubeId:meta.videoId, channel:meta.channel},
      video:{title:meta.title, duration:'~4 min', chapters:['Watch','Wonder','Connect'], script:'Watch with Scout’s questions in mind: what surprised you?'},
      provenance:prov,
      predict:{type:'choice', q:'Before you watch — which question do you MOST want answered?', options:['How does it work?','Why does it happen?','What happens next?']},
      questions, questionBank:QUESTION_BANK,
      creative:{title:'Respond to the video', prompt:'Draw, build, or explain your response to “'+title+'”. Teach it back!', tabs:['draw','voice','build'], scout:'Teaching it back — the ultimate explorer move!'},
      rabbitHoles:[{to:'volcano',why:'Scout’s wild pick',bridge:'Every explorer needs a volcano story.'},{to:'jets',why:'Speedy minds',bridge:'Fast machines, fast questions.'},{to:'dino',why:'Deep-time wonder',bridge:'Some wonders are millions of years old.'}],
      skills:['Science','Reading','Critical Thinking'], tags:['Mysteries'],
      concepts:(opts.concepts&&opts.concepts.length?opts.concepts:['curiosity'])
    };
  }
};
/* Regeneration bank for single-question refresh (demo-mode, labeled). */
const QUESTION_BANK = [
  {kind:'mc', q:'Which question would a scientist ask next?', options:['Why does that happen?','What color is it?','Who cares?'], answer:0, why:'“Why” questions power science!', sourceConcept:'inquiry', sourceProvenance:'demo'},
  {kind:'mc', q:'What should you do when something surprises you?', options:['Investigate it!','Ignore it','Change the subject'], answer:0, why:'Surprise is your brain saying “save this!”', sourceConcept:'curiosity', sourceProvenance:'demo'},
  {kind:'tf', q:'True or false: It is okay to change your mind when you learn something new.', options:['True','False'], answer:0, why:'True! Changing your mind is how learning works.', sourceConcept:'mindset', sourceProvenance:'demo'},
  {kind:'mc', q:'How would you explain it to a 4-year-old?', options:['Use simple words + an example','Use big tricky words','Don’t explain at all'], answer:0, why:'Simple explanations show deep understanding!', sourceConcept:'transfer', sourceProvenance:'demo'}
];
const MissionValidator = {
  check(d){
    const issues = [];
    if(!d.questions||d.questions.length<3) issues.push('Needs at least 3 activities');
    d.questions.forEach((q,i)=>{ if((q.kind==='mc'||q.kind==='tf')&&(!q.options||q.options.length<2)) issues.push('Q'+(i+1)+' needs options'); });
    const recall = d.questions.filter(q=>/what (color|year|word|name)/i.test(q.q)).length;
    if(recall>=2) issues.push('Too much trivia — favor thinking questions');
    if(!d.predict) issues.push('Missing prediction prompt');
    if(!d.creative) issues.push('Missing creative challenge');
    return {pass:issues.length===0, issues};
  }
};
