/**
 * public/js/listing-form.js  -  runs in the BROWSER on the create/edit listing page
 * -------------------------------------------------------------
 * 1. Dynamic specification fields
 *    When the seller picks a category, ask the server which fields that
 *    appliance type has (GET /api/categories/:key/fields, answered by the
 *    Simple Factory) and build the inputs. Choose "Refrigerator" and you
 *    get Style / Total capacity / Freezer capacity; choose "Air
 *    Conditioner" and you get Type / BTU / Coverage area.
 *
 * 2. Photo preview + instant checks (count and size), so the seller
 *    sees problems BEFORE uploading. The server checks again anyway.
 */
(function () {
  var form = document.getElementById('listing-form');
  if (!form) return;

  // ================= 1. Specification fields =================
  var categorySelect = form.querySelector('select[name="category"]');
  var specBox = document.getElementById('spec-fields');
  var savedValues = JSON.parse(specBox.dataset.values || '{}'); // values to prefill (edit / after an error)

  /** Builds one <label> + input for a field definition from the factory. */
  function buildField(field) {
    var label = document.createElement('label');
    var text = field.label + (field.unit ? ' (' + field.unit + ')' : '') + (field.required ? ' *' : '');
    label.appendChild(document.createTextNode(text));

    var input;
    if (field.type === 'select') {
      input = document.createElement('select');
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Choose…';
      input.appendChild(empty);
      field.options.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      if (field.type === 'number') input.step = 'any';
      if (field.min !== undefined) input.min = field.min;
      if (field.max !== undefined) input.max = field.max;
      if (field.type === 'text') input.maxLength = 60;
    }

    // Form name "specs[capacityLiters]" arrives on the server as req.body.specs.capacityLiters
    input.name = 'specs[' + field.name + ']';
    if (field.required) input.required = true;
    if (savedValues[field.name] !== undefined) input.value = savedValues[field.name];

    label.appendChild(input);
    return label;
  }

  /** Loads and draws the fields for a category. */
  function loadSpecFields(category) {
    if (!category) {
      specBox.innerHTML = '<p class="muted">Choose a category to see its specifications.</p>';
      return;
    }
    specBox.innerHTML = '<p class="muted">Loading…</p>';

    fetch('/api/categories/' + encodeURIComponent(category) + '/fields')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (fields) {
        specBox.innerHTML = '';
        fields.forEach(function (f) { specBox.appendChild(buildField(f)); });
      })
      .catch(function () {
        // Robustness: network problem -> clear message instead of a blank box.
        specBox.innerHTML = '<p class="alert alert-error">Could not load the specification fields. Check your connection and choose the category again.</p>';
      });
  }

  categorySelect.addEventListener('change', function () { loadSpecFields(categorySelect.value); });
  loadSpecFields(categorySelect.value); // initial draw (edit mode / after an error)

  // ================= 2. Photo preview =================
  var fileInput = form.querySelector('input[type="file"][name="photos"]');
  var previews = document.getElementById('photo-previews');
  var warning = document.getElementById('photo-warning');
  var maxPhotos = Number(fileInput.dataset.max);
  var maxBytes = Number(fileInput.dataset.maxBytes);

  fileInput.addEventListener('change', function () {
    previews.innerHTML = '';
    var problems = [];
    var files = Array.prototype.slice.call(fileInput.files);

    if (files.length > maxPhotos) problems.push('Please choose at most ' + maxPhotos + ' photos.');

    files.forEach(function (file) {
      if (file.size > maxBytes) {
        problems.push('"' + file.name + '" is larger than ' + Math.round(maxBytes / 1048576) + ' MB.');
      }
      var img = document.createElement('img');
      img.alt = file.name;
      img.src = URL.createObjectURL(file); // local preview, nothing uploaded yet
      previews.appendChild(img);
    });

    warning.textContent = problems.join(' ');
  });
})();
