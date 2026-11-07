(function (global) {
  'use strict';

  // All measurements are millimetres. No network requests or remote assets.
  var DISCLAIMER = 'Identificação pet privada. Não substitui documento oficial ou registro veterinário.';
  var TYPES = ['identity', 'birth', 'vaccination', 'tag', 'kit'];
  var THEMES = {
    forest: { ink: [25, 61, 53], accent: [177, 143, 73], pale: [239, 245, 239] },
    ocean: { ink: [22, 65, 94], accent: [42, 140, 163], pale: [237, 245, 249] },
    rose: { ink: [104, 53, 73], accent: [181, 126, 111], pale: [251, 241, 243] }
  };

  // Helvetica/Times in jsPDF support Portuguese through WinAnsi, but not emoji
  // or arbitrary Unicode scripts. Sanitize those rather than emit broken glyphs.
  function clean(value, max) {
    var s = value == null ? '' : String(value);
    if (s.normalize) s = s.normalize('NFC');
    return s.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
      .replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"').replace(/\u2026/g, '...')
      .replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, '')
      .replace(/\s+/g, ' ').trim().slice(0, max || 1500);
  }
  function value(v) { return clean(v) || 'Não informado'; }
  function date(v) {
    var s = clean(v, 40);
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(s);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : value(s);
  }
  function filename(type, name) {
    var labels = { identity: 'identidade', birth: 'certidao', vaccination: 'vacinacao', tag: 'tag', kit: 'kit' };
    var n = clean(name, 70).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return 'pet-' + labels[type] + '-' + (n || 'sem-nome') + '.pdf';
  }
  function color(doc, rgb, kind) {
    doc[kind || 'setTextColor'](rgb[0], rgb[1], rgb[2]);
  }
  function font(doc, size, style, family) {
    doc.setFont(family || 'helvetica', style || 'normal');
    doc.setFontSize(size);
  }
  function fit(doc, text, width, size, min, style) {
    font(doc, size, style);
    while (doc.getTextWidth(text) > width && size > min) {
      size = Math.max(min, size - 0.25);
      doc.setFontSize(size);
    }
    if (doc.getTextWidth(text) <= width) return text;
    while (text && doc.getTextWidth(text + '...') > width) text = text.slice(0, -1);
    return text + '...';
  }
  function line(doc, text, x, y, width, size, min, style) {
    doc.text(fit(doc, clean(text), width, size, min || size, style), x, y);
  }
  function block(doc, text, x, y, width, size, leading, maxLines, style) {
    font(doc, size, style);
    var lines = doc.splitTextToSize(clean(text), width);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = fit(doc, lines[maxLines - 1] + '...', width, size, size, style);
    }
    lines.forEach(function (s, i) { doc.text(s, x, y + i * leading); });
    return y + lines.length * leading;
  }
  function rule(doc, x1, y, x2, rgb, weight) {
    color(doc, rgb, 'setDrawColor'); doc.setLineWidth(weight || 0.25); doc.line(x1, y, x2, y);
  }
  function paw(doc, x, y, scale, rgb) {
    color(doc, rgb, 'setFillColor');
    doc.ellipse(x, y + 1.8 * scale, 2.5 * scale, 2 * scale, 'F');
    [[-2.8, -0.5], [-1.1, -2], [1.1, -2], [2.8, -0.5]].forEach(function (p) {
      doc.ellipse(x + p[0] * scale, y + p[1] * scale, 0.85 * scale, 1.2 * scale, 'F');
    });
  }
  function rounded(doc, x, y, w, h, r, fill, stroke) {
    if (fill) color(doc, fill, 'setFillColor');
    if (stroke) color(doc, stroke, 'setDrawColor');
    doc.roundedRect(x, y, w, h, r, r, fill && stroke ? 'FD' : fill ? 'F' : 'S');
  }
  function photo(doc, pet, x, y, w, h, theme) {
    rounded(doc, x, y, w, h, 1.8, theme.pale);
    if (pet.photo) {
      try {
        if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(pet.photo)) throw new Error('format');
        var props = doc.getImageProperties(pet.photo);
        var ratio = Math.min((w - 1) / props.width, (h - 1) / props.height);
        var iw = props.width * ratio, ih = props.height * ratio;
        doc.addImage(pet.photo, props.fileType, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
        return;
      } catch (_) { /* Invalid or unsupported photos receive the same vector placeholder. */ }
    }
    paw(doc, x + w / 2, y + h * 0.43, Math.min(w, h) / 12, theme.ink);
    color(doc, theme.ink);
    font(doc, Math.min(7, w / 3)); doc.text('FOTO DO PET', x + w / 2, y + h * 0.83, { align: 'center' });
  }
  function footer(doc, theme) {
    rule(doc, 18, 282, 192, theme.accent);
    color(doc, [100, 108, 113]); font(doc, 7);
    doc.text(DISCLAIMER, 105, 287, { align: 'center' });
  }
  function page(doc, theme, title, subtitle, first) {
    if (!first) doc.addPage('a4', 'portrait');
    color(doc, [255, 255, 255], 'setFillColor'); doc.rect(0, 0, 210, 297, 'F');
    rounded(doc, 18, 17, 12, 12, 3, theme.ink);
    paw(doc, 24, 23, 1, [255, 255, 255]);
    color(doc, theme.ink); font(doc, 8, 'bold'); doc.text('CARTEIRA PET  /  ACERVO PESSOAL', 35, 22);
    font(doc, 7.5); doc.text('Cuidado, vínculo e identificação', 35, 27);
    line(doc, title, 18, 44, 174, 24, 18, 'bold');
    color(doc, [100, 108, 113]); line(doc, subtitle, 18, 52, 174, 9, 8);
    footer(doc, theme);
  }
  function field(doc, label, val, x, y, width, theme, size) {
    color(doc, theme.ink); font(doc, 6, 'bold'); doc.text(label.toUpperCase(), x, y);
    color(doc, [35, 43, 49]); line(doc, value(val), x, y + 4.2, width, size || 9, 6);
  }
  function cardField(doc, label, val, x, y, width) {
    color(doc, [65, 94, 115]); font(doc, 4.5, 'bold'); doc.text(label, x, y);
    color(doc, [15, 46, 75]); line(doc, value(val), x, y + 3.1, width, 6.5, 4.8);
  }
  function identity(doc, pet, theme, qr, first) {
    page(doc, theme, 'Identidade do pet', 'Frente e verso em tamanho real: 85,6 × 54 mm.', first);
    var x = 62.2, y = 69, w = 85.6, h = 54;
    function base(top, back) {
      rounded(doc, x, top, w, h, 3, theme.pale, theme.ink);
      // Guilloche-inspired geometry, drawn entirely as vectors.
      color(doc, theme.accent, 'setDrawColor'); doc.setLineWidth(0.08);
      for (var i = 0; i < 8; i++) doc.ellipse(x + 61, top + 30, 5 + i * 2.5, 6 + i * 1.8, 'S');
      rounded(doc, x + 0.6, top + 0.6, w - 1.2, 10.5, 2.5, theme.ink);
      color(doc, pet.theme === 'ocean' ? [240, 198, 76] : theme.accent, 'setFillColor'); doc.rect(x + 3, top + 12, 1.1, 36, 'F');
      color(doc, [255, 255, 255]); font(doc, 8, 'bold'); doc.text('IDENTIDADE PET', x + 5, top + 5.4);
      font(doc, 4.6); doc.text(back ? 'PERFIL E CONTATO  /  VERSO' : 'IDENTIFICAÇÃO PRIVADA  /  FRENTE', x + 5, top + 8.3);
      color(doc, [58, 83, 105]); font(doc, 3.7);
      doc.text('Identificação pet privada. Não substitui documento oficial', x + w / 2, top + 50.4, { align: 'center' });
      doc.text('ou registro veterinário.', x + w / 2, top + 52.2, { align: 'center' });
    }
    base(y, false);
    photo(doc, pet, x + 6, y + 15, 22, 28, theme);
    cardField(doc, 'NOME DO PET', pet.name, x + 31, y + 16, 49);
    cardField(doc, 'ESPÉCIE / RAÇA', [clean(pet.species), clean(pet.breed)].filter(Boolean).join(' / '), x + 31, y + 24, 49);
    cardField(doc, 'NASCIMENTO', date(pet.birth), x + 31, y + 32, 25);
    cardField(doc, 'SEXO', pet.sex, x + 59, y + 32, 20);
    cardField(doc, 'TUTOR(A)', pet.tutor, x + 31, y + 40, 49);
    color(doc, [65, 94, 115]); line(doc, 'COR: ' + value(pet.color), x + 6, y + 46, 74, 5.5, 4.5);
    y = 143; base(y, true);
    if (qr) {
      doc.addImage(qr, 'PNG', x + 53, y + 15, 27, 27);
      color(doc, [19, 58, 94]); font(doc, 4.8); doc.text('ABRA O PERFIL DO PET', x + 66.5, y + 45.5, { align: 'center' });
    } else {
      rounded(doc, x + 53, y + 15, 27, 31, 2, [231, 239, 245]);
      color(doc, [84, 111, 132]); font(doc, 5.8);
      doc.text('Adicione o QR no app', x + 66.5, y + 29, { align: 'center' });
      font(doc, 4.5);
      doc.text('Quando você autorizar', x + 66.5, y + 34, { align: 'center' });
    }
    cardField(doc, 'TELEFONE', pet.phone, x + 6, y + 16, 44);
    cardField(doc, 'CIDADE', pet.city, x + 6, y + 24, 44);
    cardField(doc, 'OUTRO(A) TUTOR(A)', pet.tutor2, x + 6, y + 32, 44);
    cardField(doc, 'E-MAIL', pet.email, x + 6, y + 40, 44);
    color(doc, [65, 94, 115]); line(doc, 'ID PRIVADO: ' + value(pet.id), x + 6, y + 46, 44, 4.8, 4);
    color(doc, theme.ink); font(doc, 10, 'bold'); doc.text('Imprima em escala de 100%', 18, 220);
    var instructions = 'Desative "ajustar à página". Recorte junto à borda de cada cartão e monte frente e verso. ';
    instructions += qr ? 'O QR abre o endereço de perfil informado no aplicativo.' : 'Para adicionar o QR, preencha o contato e autorize o perfil no app; depois gere novamente a identidade.';
    block(doc, instructions, 18, 228, 174, 9, 5, 3);
    if (!qr) {
      color(doc, [84, 111, 132]);
      block(doc, 'A tag não está incluída: ela é gerada após preencher o contato e autorizar o perfil no app.', 18, 246, 174, 8, 4, 2);
    }
    rule(doc, 18, 255, 68, theme.ink, 0.5);
    font(doc, 7); doc.text('Referência de impressão: 50 mm', 18, 260);
  }
  function birth(doc, pet, theme, first) {
    page(doc, theme, 'Certidão do pet', 'Uma lembrança personalizada da história de quem faz parte da família.', first);
    color(doc, theme.accent, 'setDrawColor'); doc.setLineWidth(0.6); doc.rect(19, 62, 172, 207, 'S');
    doc.setLineWidth(0.2); doc.rect(21, 64, 168, 203, 'S');
    [[25, 69], [185, 69], [25, 261], [185, 261]].forEach(function (p) { paw(doc, p[0], p[1], 0.65, theme.accent); });
    color(doc, theme.ink); font(doc, 12, 'italic', 'times');
    doc.text('Celebramos a chegada de', 105, 81, { align: 'center' });
    var name = fit(doc, value(pet.name), 142, 31, 16, 'bold');
    doc.setFont('times', 'bold'); doc.text(name, 105, 96, { align: 'center' });
    rule(doc, 65, 103, 145, theme.accent);
    photo(doc, pet, 85, 111, 40, 43, theme);
    field(doc, 'Nascimento', date(pet.birth), 32, 167, 65, theme, 12);
    field(doc, 'Cidade', pet.city, 112, 167, 65, theme, 12);
    field(doc, 'Espécie', pet.species, 32, 184, 65, theme, 11);
    field(doc, 'Raça / sexo', [clean(pet.breed), clean(pet.sex)].filter(Boolean).join(' / '), 112, 184, 65, theme, 11);
    field(doc, 'Tutor(a)', pet.tutor, 32, 202, 145, theme, 13);
    field(doc, 'Outro(a) tutor(a)', pet.tutor2, 32, 219, 145, theme, 13);
    color(doc, theme.ink); font(doc, 11, 'italic', 'times');
    doc.text('Um vínculo para cuidar, proteger e celebrar.', 105, 243, { align: 'center' });
    font(doc, 7); doc.text('Certidão afetiva e decorativa, sem validade legal.', 105, 254, { align: 'center' });
  }
  function vaccination(doc, pet, theme, first) {
    var records = Array.isArray(pet.vaccines) ? pet.vaccines : [];
    var columns = [18, 54, 78, 102, 150, 192];
    function head(isFirst) {
      page(doc, theme, 'Caderneta de vacinação', 'Registros fornecidos pelo tutor. Confirme as informações com o veterinário.', isFirst);
      rounded(doc, 18, 61, 174, 23, 3, theme.pale);
      field(doc, 'Pet', pet.name, 23, 68, 71, theme, 11);
      field(doc, 'Tutor(a)', pet.tutor, 104, 68, 82, theme, 10);
      color(doc, theme.ink, 'setFillColor'); doc.rect(18, 92, 174, 10, 'F');
      color(doc, [255, 255, 255]); font(doc, 7, 'bold');
      ['VACINA', 'DATA', 'PRÓXIMA DATA', 'CLÍNICA', 'LOTE'].forEach(function (s, i) { doc.text(s, columns[i] + 2, 98); });
    }
    head(first);
    var y = 102, count = records.length || 6;
    for (var i = 0; i < count; i++) {
      var record = records[i] && typeof records[i] === 'object' ? records[i] : {};
      var cells = records.length ? [value(record.name), date(record.date), date(record.next), value(record.clinic), value(record.lot)] : ['', '', '', '', ''];
      font(doc, 8);
      var lines = cells.map(function (s, c) { return doc.splitTextToSize(s, columns[c + 1] - columns[c] - 4); });
      var height = Math.max(16, Math.max.apply(null, lines.map(function (l) { return l.length; })) * 4 + 7);
      // Input is capped at normalization, so even a fully populated cell fits a page.
      if (y + height > 245) { head(false); y = 102; }
      color(doc, i % 2 ? [255, 255, 255] : theme.pale, 'setFillColor'); doc.rect(18, y, 174, height, 'F');
      color(doc, [51, 64, 70]); font(doc, 8);
      lines.forEach(function (ls, c) { ls.forEach(function (s, n) { doc.text(s, columns[c] + 2, y + 6 + n * 4); }); });
      rule(doc, 18, y + height, 192, [215, 223, 225], 0.15); y += height;
    }
    if (y + 34 > 273) { head(false); y = 110; }
    color(doc, theme.ink); font(doc, 9, 'bold'); doc.text('Anotações para preenchimento pelo veterinário', 18, y + 12);
    font(doc, 7); doc.text('Espaço de registro. Este material não prescreve vacinas ou intervalos.', 18, y + 19);
    rule(doc, 18, y + 26, 192, [190, 201, 203]);
    rule(doc, 18, y + 33, 192, [190, 201, 203]);
    if (pet.notes) {
      page(doc, theme, 'Observações do tutor', 'Informações pessoais de apoio ao cuidado do pet.', false);
      field(doc, 'Pet', pet.name, 18, 68, 174, theme, 14);
      color(doc, [51, 64, 70]); block(doc, pet.notes, 18, 84, 174, 10, 5, 36);
    }
  }
  function tag(doc, pet, theme, qr, first) {
    page(doc, theme, 'Tag de identificação', 'Molde quadrado em tamanho real: 4 × 4 cm.', first);
    var x = 85, y = 77;
    rounded(doc, x, y, 40, 40, 2, [255, 255, 255], theme.ink);
    color(doc, theme.ink);
    var name = fit(doc, value(pet.name), 35, 10, 6, 'bold');
    doc.text(name, 105, y + 5.5, { align: 'center' });
    // QR includes a four-module white quiet zone on every side.
    doc.addImage(qr, 'PNG', x + 8, y + 7, 24, 24);
    var phone = fit(doc, value(pet.phone), 35, 8, 5);
    color(doc, theme.ink); doc.text(phone, 105, y + 35, { align: 'center' });
    font(doc, 3.5); doc.text('IDENTIFICAÇÃO PET PRIVADA', 105, y + 38, { align: 'center' });
    color(doc, theme.ink); font(doc, 12, 'bold'); doc.text('Pequena no tamanho. Essencial no encontro.', 18, 144);
    block(doc, 'Imprima em 100%, sem ajustar à página. Recorte pela borda. Proteja a impressão e mantenha o QR livre de furos, dobras e reflexos. O telefone acima é o contato informado pelo tutor.', 18, 155, 174, 10, 6, 5);
    block(doc, 'O QR contém o endereço real do perfil informado no aplicativo. A disponibilidade e a atualização desse perfil dependem do endereço fornecido.', 18, 190, 174, 9, 5, 4);
    rule(doc, 18, 235, 58, theme.ink, 0.5); font(doc, 7); doc.text('Referência de impressão: 40 mm', 18, 241);
  }
  function normalizePet(pet) {
    if (!pet || typeof pet !== 'object' || Array.isArray(pet)) throw new Error('Informe os dados do pet para gerar o PDF.');
    var p = {};
    ['id', 'name', 'species', 'breed', 'sex', 'birth', 'tutor', 'tutor2', 'phone', 'email', 'city', 'address', 'color', 'notes', 'theme'].forEach(function (k) { p[k] = clean(pet[k], k === 'notes' ? 1500 : 250); });
    p.photo = typeof pet.photo === 'string' ? pet.photo : '';
    p.vaccines = Array.isArray(pet.vaccines) ? pet.vaccines.map(function (r) {
      var v = {}; r = r && typeof r === 'object' ? r : {};
      ['id', 'name', 'date', 'next', 'clinic', 'lot'].forEach(function (k) { v[k] = clean(r[k], 120); });
      return v;
    }) : [];
    return p;
  }
  async function makeQR(url) {
    if (!global.QRCode || typeof global.QRCode.toDataURL !== 'function') throw new Error('Gerador de QR indisponível. Carregue QRCode antes de gerar este documento.');
    if (typeof url !== 'string' || !url.trim()) throw new Error('Informe options.profileUrl com a URL real do perfil do pet.');
    var parsed;
    try { parsed = new URL(url); } catch (_) { throw new Error('A URL do perfil do pet é inválida.'); }
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use uma URL de perfil HTTP ou HTTPS sem credenciais.');
    var canvas = global.document.createElement('canvas');
    // Use the explicit canvas overload, supported by the browser QRCode bundle.
    try {
      var result = await global.QRCode.toDataURL(canvas, url, { errorCorrectionLevel: 'M', margin: 4, scale: 8, color: { dark: '#102a43', light: '#ffffff' } });
      // Limit module density to preserve a practical printed module size on the 24 mm tag.
      var modules = canvas.width / 8;
      if (modules > 80) throw new Error('O endereço do perfil é longo demais para um QR legível na tag. Use uma URL real mais curta.');
      if (typeof result !== 'string' || !/^data:image\/png[;,]/.test(result)) throw new Error('O gerador de QR não retornou uma imagem PNG.');
      return result;
    } catch (error) {
      throw new Error('Não foi possível gerar o QR do perfil. ' + (error && error.message ? error.message : 'Verifique o endereço informado.'));
    }
  }
  async function build(type, input, options) {
    if (TYPES.indexOf(type) === -1) throw new Error('Tipo de documento inválido. Use identity, birth, vaccination, tag ou kit.');
    if (!global.jspdf || typeof global.jspdf.jsPDF !== 'function') throw new Error('jsPDF indisponível. Carregue window.jspdf.jsPDF antes de gerar documentos.');
    var pet = normalizePet(input), theme = THEMES[pet.theme] || THEMES.forest;
    options = options || {};
    // An absent URL means the tutor has not enabled a shareable profile yet.
    // Supplied but invalid URLs still produce an actionable error.
    var hasProfileUrl = options.profileUrl != null && options.profileUrl !== '' &&
      (typeof options.profileUrl !== 'string' || options.profileUrl.trim() !== '');
    var qr = null;
    if (type === 'tag' || (hasProfileUrl && (type === 'identity' || type === 'kit'))) {
      qr = await makeQR(options.profileUrl);
    }
    var doc = new global.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({ title: 'Documentos de ' + value(pet.name), subject: 'Identificação pet privada', author: 'Carteira Pet', keywords: 'pet, identificação privada' });
    var renderers = { identity: identity, birth: birth, vaccination: vaccination, tag: tag };
    var sequence = type === 'kit' ? ['identity', 'birth', 'vaccination'] : [type];
    if (type === 'kit' && qr) sequence.push('tag');
    sequence.forEach(function (kind, i) {
      if (kind === 'identity' || kind === 'tag') renderers[kind](doc, pet, theme, qr, i === 0);
      else renderers[kind](doc, pet, theme, i === 0);
    });
    var total = doc.getNumberOfPages();
    for (var n = 1; n <= total; n++) {
      doc.setPage(n); color(doc, [120, 127, 131]); font(doc, 6.5);
      doc.text(n + ' / ' + total, 192, 292, { align: 'right' });
    }
    var blob = doc.output('blob');
    if (!blob || !blob.size) throw new Error('Não foi possível finalizar o PDF.');
    return { blob: blob, name: filename(type, pet.name) };
  }
  async function preview(type, pet, options) {
    var result = await build(type, pet, options);
    // The caller owns this preview URL and must revoke it when replacing/closing it.
    return global.URL.createObjectURL(result.blob);
  }
  async function download(type, pet, options) {
    var result = await build(type, pet, options);
    var url = global.URL.createObjectURL(result.blob);
    var anchor = global.document.createElement('a');
    anchor.href = url; anchor.download = result.name; anchor.style.display = 'none';
    try {
      (global.document.body || global.document.documentElement).appendChild(anchor);
      anchor.click();
    } catch (error) {
      global.URL.revokeObjectURL(url);
      throw new Error('Não foi possível iniciar o download do PDF. ' + (error.message || ''));
    } finally { if (anchor.parentNode) anchor.parentNode.removeChild(anchor); }
    // Keep the returned URL usable by the caller, just like preview().
    return url;
  }
  global.PetDocuments = Object.freeze({ download: download, preview: preview });
})(window);
