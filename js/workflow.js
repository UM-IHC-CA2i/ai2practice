var WorkflowDiagram = (function() {
  'use strict';

  var workflowSteps = [
    { id: 'order', num: '1', name: 'Order',
      desc: 'AI can flag inappropriate imaging orders, suggest optimal protocols based on clinical indication, and check for contraindications (e.g., renal function before contrast) before imaging is performed.',
      example: 'Clinical decision support (CDS) systems like ACR Select use AI to match orders against appropriateness criteria, reducing unnecessary exams by 10-20%.' },
    { id: 'scheduling', num: '2', name: 'Scheduling',
      desc: 'AI optimizes scanner utilization by predicting scan duration, forecasting no-shows, and intelligently matching patients to the right equipment and time slots based on clinical urgency.',
      example: 'GE Healthcare and Siemens offer AI-driven scheduling that predicts MRI scan times within 5 minutes, reducing idle scanner time and improving patient throughput.' },
    { id: 'triage', num: '3', name: 'Triage',
      desc: 'AI prioritizes urgent cases by analyzing images as they arrive, flagging critical findings (e.g., large vessel occlusion, tension pneumothorax, intracranial hemorrhage) and moving them to the top of the reading worklist.',
      example: 'Aidoc and Viz.ai analyze head CTs in real time, flagging large vessel occlusions within minutes and notifying the stroke team directly, reducing door-to-treatment time.' },
    { id: 'acquisition', num: '4', name: 'Acquisition',
      desc: 'AI auto-positions patients in the scanner, adjusts scan parameters for optimal image quality, reduces radiation dose through intelligent reconstruction, and performs real-time quality checks during image capture.',
      example: 'Siemens ALPHA technology uses AI to auto-position patients for chest X-rays, reducing retake rates. Canon\'s AiCE deep learning reconstruction cuts CT dose by up to 50%.' },
    { id: 'interpretation', num: '5', name: 'Interpretation',
      desc: 'The core of radiology AI. AI assists radiologists in reading images through detection, segmentation, classification, quantification, and more. Click on the interpretation subtypes below to learn about each one.',
      example: 'Over 75% of FDA-cleared radiology AI products focus on the interpretation step. Major categories include detection, segmentation, classification, quantification, prioritization, and prediction.',
      isInterp: true },
    { id: 'reporting', num: '6', name: 'Reporting',
      desc: 'AI assists with structured reporting by auto-populating measurements, suggesting standardized language (e.g., BI-RADS, Lung-RADS, TI-RADS), recommending follow-up intervals, and checking reports for completeness.',
      example: 'Nuance PowerScribe uses AI to auto-populate follow-up recommendations and flag discrepancies between impression and body text, reducing report errors.' },
    { id: 'communication', num: '7', name: 'Communication & Follow-up',
      desc: 'AI tracks critical result notifications to ensure closed-loop communication, manages follow-up recommendation compliance, and alerts referring physicians about incidental findings that need action.',
      example: 'Nuance Follow-up Manager uses NLP to mine radiology reports for recommendations and tracks whether follow-up imaging was completed, closing the care gap loop.' }
  ];

  var interpTypes = [
    { id: 'detection', name: 'Detection',
      desc: 'Locating abnormalities in images: pulmonary nodules on CT, fractures on X-ray, intracranial hemorrhage on head CT, and masses on mammography. The most common clinical AI application in radiology.',
      example: 'Lunit INSIGHT CXR detects 10 types of chest X-ray findings including nodules, consolidation, and pneumothorax with over 97% sensitivity.' },
    { id: 'segmentation', name: 'Segmentation',
      desc: 'Outlining structures pixel-by-pixel: organ boundaries, tumor volumes, vessel paths, and anatomical landmarks. Essential for treatment planning, volumetric analysis, and surgical navigation.',
      example: 'In radiation oncology, AI auto-segments organs at risk on CT in minutes vs. hours manually, enabling faster treatment planning for cancer patients.' },
    { id: 'classification', name: 'Classification',
      desc: 'Categorizing findings into diagnostic groups: benign vs. malignant, fracture type, BI-RADS category, Lung-RADS scoring. Assigns diagnostic labels to images or specific regions of interest.',
      example: 'Koios DS Breast classifies breast ultrasound lesions as benign or malignant, providing a BI-RADS assessment that agrees with expert radiologists 90%+ of the time.' },
    { id: 'quantification', name: 'Quantification',
      desc: 'Extracting precise measurements from images: tumor volume, coronary calcium score, ejection fraction, bone mineral density, liver fat fraction, and brain volume changes over time.',
      example: 'Arterys (now Tempus Radiology) quantifies cardiac MRI ejection fraction automatically, and HeartFlow computes coronary FFR from CT angiography without invasive catheterization.' },
    { id: 'prioritization', name: 'Prioritization',
      desc: 'Reordering the reading worklist based on image-level urgency. Unlike workflow triage (which routes cases), interpretation prioritization scores individual images to bump critical reads ahead of routine ones.',
      example: 'Aidoc\'s always-on AI scans every CT as it arrives and flags suspected PE, ICH, or c-spine fractures, moving them to the top of the radiologist\'s worklist within minutes.' },
    { id: 'prediction', name: 'Prediction',
      desc: 'Forecasting clinical outcomes from imaging data: treatment response prediction, disease progression risk, survival estimation from imaging biomarkers, and recurrence risk stratification.',
      example: 'Optellum\'s Virtual Nodule Clinic predicts malignancy risk for pulmonary nodules, helping clinicians decide between biopsy, follow-up CT, or discharge.' }
  ];

  function renderDetail(container, data) {
    var html = '<div class="wf-detail-content"><h4>' + data.name + '</h4>';
    html += '<p>' + data.desc + '</p>';
    if (data.example) {
      html += '<div class="wf-example"><div class="wf-example-label">Example</div>';
      html += '<p>' + data.example + '</p></div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function init(rootId) {
    var root = document.getElementById(rootId);
    if (!root) return;

    var chevContainer = root.querySelector('.wf-chevrons');
    var leftPanel = root.querySelector('.wf-left');
    var rightPanel = root.querySelector('.wf-right');

    workflowSteps.forEach(function(s) {
      var div = document.createElement('div');
      div.className = 'wf-chev';
      div.dataset.step = s.id;
      div.innerHTML = '<div class="wf-chev-shape"><div class="wf-chev-num">' + s.num + '</div><div class="wf-chev-name">' + s.name + '</div></div>';
      chevContainer.appendChild(div);
    });

    var leftHtml = '';
    workflowSteps.forEach(function(s) {
      var hasChildren = s.isInterp;
      leftHtml += '<div class="wf-acc-header" data-id="' + s.id + '" data-type="step">';
      leftHtml += '<div class="wf-acc-header-num">' + s.num + '</div>';
      leftHtml += '<div class="wf-acc-header-name">' + s.name + '</div>';
      if (hasChildren) leftHtml += '<div class="wf-acc-arrow">&#9654;</div>';
      leftHtml += '</div>';
      if (hasChildren) {
        leftHtml += '<div class="wf-acc-children" data-parent="' + s.id + '">';
        interpTypes.forEach(function(t) {
          leftHtml += '<div class="wf-acc-child" data-id="' + t.id + '" data-type="interp">';
          leftHtml += '<span class="wf-acc-child-name">' + t.name + '</span></div>';
        });
        leftHtml += '</div>';
      }
    });
    leftPanel.innerHTML = leftHtml;

    function clearActive() {
      root.querySelectorAll('.wf-acc-header, .wf-acc-child').forEach(function(el) { el.classList.remove('active'); });
      root.querySelectorAll('.wf-acc-header').forEach(function(el) { el.classList.remove('expanded'); });
      root.querySelectorAll('.wf-acc-children').forEach(function(el) { el.classList.remove('visible'); });
      root.querySelectorAll('.wf-chev').forEach(function(el) { el.classList.remove('active'); });
    }

    function selectStep(id) {
      clearActive();
      var data = workflowSteps.find(function(s) { return s.id === id; });
      if (!data) return;

      var header = root.querySelector('.wf-acc-header[data-id="' + id + '"]');
      if (header) header.classList.add('active');

      var chev = root.querySelector('.wf-chev[data-step="' + id + '"]');
      if (chev) chev.classList.add('active');

      if (data.isInterp) {
        if (header) header.classList.add('expanded');
        var children = root.querySelector('.wf-acc-children[data-parent="' + id + '"]');
        if (children) children.classList.add('visible');
      }

      renderDetail(rightPanel, data);
    }

    function selectInterp(id) {
      clearActive();
      var data = interpTypes.find(function(t) { return t.id === id; });
      if (!data) return;

      var child = root.querySelector('.wf-acc-child[data-id="' + id + '"]');
      if (child) child.classList.add('active');

      var interpHeader = root.querySelector('.wf-acc-header[data-id="interpretation"]');
      if (interpHeader) { interpHeader.classList.add('expanded'); }
      var children = root.querySelector('.wf-acc-children[data-parent="interpretation"]');
      if (children) children.classList.add('visible');

      var interpChev = root.querySelector('.wf-chev[data-step="interpretation"]');
      if (interpChev) interpChev.classList.add('active');

      renderDetail(rightPanel, data);
    }

    root.querySelectorAll('.wf-acc-header').forEach(function(header) {
      header.addEventListener('click', function() {
        selectStep(header.dataset.id);
      });
    });

    root.querySelectorAll('.wf-acc-child').forEach(function(child) {
      child.addEventListener('click', function(e) {
        e.stopPropagation();
        selectInterp(child.dataset.id);
      });
    });

    root.querySelectorAll('.wf-chev').forEach(function(chev) {
      chev.addEventListener('click', function() {
        selectStep(chev.dataset.step);
      });
    });
  }

  return { init: init };
})();
