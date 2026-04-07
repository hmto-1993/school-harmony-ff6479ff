import type { GradeEntry } from "./noor-types";

export function generateBookmarkletCode(students: GradeEntry[]): string {
  const script = `
(function(){
  var students = ${JSON.stringify(students)};
  var style = document.createElement('style');
  style.textContent = '#noorFillOverlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Tahoma,Arial,sans-serif;direction:rtl}#noorFillBox{background:#fff;border-radius:16px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)}#noorFillBox h2{margin:0 0 8px;color:#1a56db;font-size:18px}#noorFillBox .sub{color:#666;font-size:13px;margin-bottom:16px}#noorFillBox .row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:8px;margin-bottom:4px;font-size:13px}#noorFillBox .row.ok{background:#ecfdf5;color:#065f46}#noorFillBox .row.miss{background:#fef2f2;color:#991b1b}#noorFillBox .row.skip{background:#fefce8;color:#854d0e}#noorFillBox .scores{font-size:11px;color:#666;margin-top:2px}#noorFillBox .stats{display:flex;gap:12px;margin:12px 0;font-size:13px}#noorFillBox .stat{flex:1;text-align:center;padding:8px;border-radius:8px}#noorFillBox .stat.g{background:#ecfdf5;color:#065f46}#noorFillBox .stat.y{background:#fefce8;color:#854d0e}#noorFillBox .stat.r{background:#fef2f2;color:#991b1b}#noorFillBox button{padding:10px 24px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold}#noorFillBox .btnOk{background:#1a56db;color:#fff;margin-left:8px}#noorFillBox .btnOk:hover{background:#1e40af}#noorFillBox .btnCancel{background:#e5e7eb;color:#374151}#noorFillBox .catBadge{display:inline-block;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:11px;margin:0 2px}';
  document.head.appendChild(style);

  var allInputs = document.querySelectorAll('table input[type="text"], table input:not([type])');
  if(allInputs.length === 0){
    alert('لم يتم العثور على حقول إدخال درجات في هذه الصفحة.\\nتأكد من أنك في صفحة إدخال الدرجات في نظام نور.');
    return;
  }

  var totalCategories = students.length > 0 ? students[0].scores.length : 0;
  var matches = [];
  var matched = 0, unmatched = 0, noScore = 0;

  allInputs.forEach(function(inp){
    var row = inp.closest('tr');
    if(!row) return;
    var cells = row.querySelectorAll('td');
    var rowText = '';
    cells.forEach(function(c){ if(!c.querySelector('input')) rowText += ' ' + c.textContent.trim(); });
    rowText = rowText.trim();

    var found = null;
    for(var i=0;i<students.length;i++){
      var g = students[i];
      var studentName = g.name.replace(/\\s+/g,' ').trim();
      if(rowText.indexOf(studentName) !== -1 || (g.nationalId && g.nationalId !== 'غير مسجل' && rowText.indexOf(g.nationalId) !== -1)){
        found = g;
        break;
      }
    }

    if(found){
      var hasAnyScore = found.scores.some(function(s){ return s.score !== null && s.score !== undefined; });
      if(hasAnyScore){
        matches.push({input:inp, name:found.name, scores:found.scores, status:'ok'});
        matched++;
      } else {
        matches.push({input:inp, name:found.name, scores:found.scores, status:'skip'});
        noScore++;
      }
    } else {
      matches.push({input:inp, name:rowText.substring(0,40), scores:[], status:'miss'});
      unmatched++;
    }
  });

  var overlay = document.createElement('div');
  overlay.id = 'noorFillOverlay';
  var box = document.createElement('div');
  box.id = 'noorFillBox';

  var catNames = totalCategories > 0 ? students[0].scores.map(function(s){ return s.categoryName; }) : [];
  var html = '<h2>⚡ إدخال تلقائي للدرجات</h2>';
  html += '<div class="sub">المعايير: ' + catNames.map(function(n){ return '<span class="catBadge">' + n + '</span>'; }).join(' ') + '</div>';
  html += '<div class="stats">';
  html += '<div class="stat g"><strong>'+matched+'</strong><br>تطابق</div>';
  html += '<div class="stat y"><strong>'+noScore+'</strong><br>بدون درجة</div>';
  html += '<div class="stat r"><strong>'+unmatched+'</strong><br>لم يطابق</div>';
  html += '</div>';

  matches.forEach(function(m){
    var cls = m.status;
    var scoreText = '';
    if(m.status === 'ok'){
      scoreText = m.scores.filter(function(s){ return s.score !== null; }).map(function(s){ return s.categoryName + ': ' + s.score; }).join(' | ');
    } else if(m.status === 'skip'){
      scoreText = 'بدون درجة';
    } else {
      scoreText = 'لم يطابق';
    }
    html += '<div class="row '+cls+'"><span>'+m.name+'</span><span style="font-size:11px"><strong>'+scoreText+'</strong></span></div>';
  });

  html += '<div style="display:flex;justify-content:center;margin-top:16px;gap:8px">';
  html += '<button class="btnOk" id="noorFillConfirm">✓ تطبيق الدرجات</button>';
  html += '<button class="btnCancel" id="noorFillCancel">إلغاء</button>';
  html += '</div>';
  box.innerHTML = html;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('noorFillCancel').onclick = function(){ overlay.remove(); };
  document.getElementById('noorFillConfirm').onclick = function(){
    var filled = 0;
    matches.forEach(function(m){
      if(m.status === 'ok'){
        var row = m.input.closest('tr');
        if(!row) return;
        var rowInputs = row.querySelectorAll('input[type="text"], input:not([type])');
        var inputIdx = 0;
        for(var si=0; si<m.scores.length; si++){
          if(m.scores[si].score !== null && m.scores[si].score !== undefined && inputIdx < rowInputs.length){
            var targetInput = rowInputs[inputIdx];
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(targetInput, String(m.scores[si].score));
            targetInput.dispatchEvent(new Event('input', {bubbles:true}));
            targetInput.dispatchEvent(new Event('change', {bubbles:true}));
            targetInput.dispatchEvent(new Event('blur', {bubbles:true}));
            targetInput.style.backgroundColor = '#d1fae5';
            targetInput.style.transition = 'background 0.3s';
            filled++;
          }
          inputIdx++;
        }
      }
    });
    overlay.remove();
    var msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#065f46;color:#fff;padding:12px 24px;border-radius:12px;z-index:99999;font-family:Tahoma;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.2)';
    msg.textContent = '✓ تم ملء '+filled+' درجة بنجاح - تأكد من المراجعة ثم اضغط حفظ';
    document.body.appendChild(msg);
    setTimeout(function(){ msg.remove(); }, 5000);
  };
})();`;

  return `javascript:${encodeURIComponent(script.replace(/\n\s*/g, ''))}`;
}
