const generateJSON = document.getElementById('generate-btn');
const loadDiv = document.querySelector('.btn-loading-generate');
var componentSelection = document.getElementById('componentSelection');

var figmaProjectId;
var figmaApiToken;
var figmaComponent;

function checkingFields() {
  figmaComponent = componentSelection[componentSelection.selectedIndex].value;
  figmaProjectId = document.getElementById('projectId').value;
  figmaApiToken = document.getElementById('apiToken').value;

  console.log(figmaComponent);

  if (!figmaProjectId) {
    alert('Project ID must be filled');
    return false;
  }

  if (!figmaApiToken) {
    alert('Figma API Token must be filled');
    return false;
  }

  if (!figmaComponent) {
    alert('Choose Component to Generate');
    return false;
  }

  return true;
}

function download(content, fileName, contentType) {
  var a = document.createElement('a');
  var file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

////////////////////////////////////////////////

function getPalette(stylesArtboard) {
  const palette = {};
  const paletteAtrboard = stylesArtboard.filter((item) => {
    return item.name === 'colors';
  })[0].children;

  paletteAtrboard.map((item) => {
    function rbaObj(obj) {
      return item.fills[0].color[obj] * 255;
    }

    const colorObj = {
      [item.name]: `rgba(${rbaObj('r')}, ${rbaObj('g')}, ${rbaObj('b')}, ${
        item.fills[0].color.a
      })`,
    };

    Object.assign(palette, colorObj);
  });

  return palette;
}

function getGrids(stylesArtboard) {
  // empty "grids obj" wheree we will store all colors
  const grids = {};
  // get "grids" artboard
  const gridsAtrboard = stylesArtboard.filter((item) => {
    return item.name === 'grids';
  })[0].children;

  gridsAtrboard.map((item) => {
    const gridObj = {
      [item.name]: {
        count: {
          value: item.layoutGrids[0].count,
          type: 'grids',
        },
        gutter: {
          value: `${item.layoutGrids[0].gutterSize}px`,
          type: 'grids',
        },
        offset: {
          value: `${item.layoutGrids[0].offset}px`,
          type: 'grids',
        },
        width: {
          value: `${item.absoluteBoundingBox.width}px`,
          type: 'grids',
        },
      },
    };

    Object.assign(grids, gridObj);
  });

  return grids;
}

function getSpacers(stylesArtboard) {
  // empty "spacers obj" wheree we will store all colors
  const spacers = {};
  // get "spacers" artboard
  const spacersAtrboard = stylesArtboard.filter((item) => {
    return item.name === 'spacers';
  })[0].children;

  spacersAtrboard.map((item) => {
    const spacerObj = {
      [item.name]: {
        value: `${item.absoluteBoundingBox.height}px`,
        type: 'spacers',
      },
    };

    Object.assign(spacers, spacerObj);
  });

  return spacers;
}

function getFontStyles(stylesArtboard) {
  // empty "spacers obj" wheree we will store all colors
  const fontStyles = {};
  // get "spacers" artboard
  const fontStylesAtrboard = stylesArtboard.filter((item) => {
    return item.name === 'typography';
  })[0].children;

  fontStylesAtrboard.map((fontItem, i) => {
    if (fontItem.children) {
      let subFonts = {};

      // get all sub fonts
      fontItem.children.map((subFontItem) => {
        let subFontObj = {
          [subFontItem.name]: {
            family: `${subFontItem.style.fontFamily}`,
            size: `${subFontItem.style.fontSize}`,
            weight: subFontItem.style.fontWeight,
            color: `rgba(${subFontItem.fills[0].color.r * 255}, ${
              subFontItem.fills[0].color.g * 255
            }, ${subFontItem.fills[0].color.b * 255}, ${
              subFontItem.fills[0].color.a
            })`,
            spacing:
              subFontItem.style.letterSpacing !== 0
                ? `${subFontItem.style.letterSpacing}`
                : 'normal',
          },
        };
        // merge multiple subfonts objects into one
        Object.assign(subFonts, subFontObj);
      });

      //
      let fontObj = {
        [fontItem.name]: subFonts,
      };

      Object.assign(fontStyles, fontObj);
    } else {
      let fontObj = {
        [fontItem.name]: {
          family: `${fontItem.style.fontFamily}`,
          size: `${fontItem.style.fontSize}`,
          weight: fontItem.style.fontWeight,
          color: `rgba(${fontItem.fills[0].color.r * 255}, ${
            fontItem.fills[0].color.g * 255
          }, ${fontItem.fills[0].color.b * 255}, ${fontItem.fills[0].color.a})`,
          spacing:
            fontItem.style.letterSpacing !== 0
              ? `${fontItem.style.letterSpacing}`
              : 'normal',
        },
      };

      Object.assign(fontStyles, fontObj);
    }
  });

  return fontStyles;
}

// main function
async function getStylesArtboard(figmaApiKey, figmaId) {
  const result = await fetch('https://api.figma.com/v1/files/' + figmaId, {
    method: 'GET',
    headers: {
      'X-Figma-Token': figmaApiKey,
    },
  });
  const figmaTreeStructure = await result.json();

  const stylesArtboard = figmaTreeStructure.document.children.filter((item) => {
    return item.name === 'core-components';
  })[0].children;

  console.log('Figma API', stylesArtboard);

  let baseTokeensJSON = {
    token: {
      grids: {},
      spacers: {},
      colors: {},
      fonts: {},
    },
  };

  var designToken = [];

  if (figmaComponent === 'grids') {
    console.log('grids component generate');
    Object.assign(baseTokeensJSON.token.grids, getGrids(stylesArtboard));
  }

  if (figmaComponent === 'spacers') {
    console.log('spacers component generate');
    Object.assign(baseTokeensJSON.token.spacers, getSpacers(stylesArtboard));
  }

  if (figmaComponent === 'colors') {
    console.log('colors component generate');
    Object.assign(baseTokeensJSON.token.colors, getPalette(stylesArtboard));
    Object.keys(baseTokeensJSON.token.colors).map((item) => {
      designToken.push(
        `$token-colors-${item}: ${baseTokeensJSON.token.colors[item]};`
      );
    });
  }

  if (figmaComponent === 'fonts') {
    console.log('fonts component generate');
    Object.assign(baseTokeensJSON.token.fonts, getFontStyles(stylesArtboard));
    Object.keys(baseTokeensJSON.token.fonts).map((item) => {
      Object.keys(baseTokeensJSON.token.fonts[item]).map((subItem) => {
        designToken.push(
          `$token-fonts-${item}-${subItem}: ${baseTokeensJSON.token.fonts[item][subItem]};`
        );
      });
    });
  }

  var baseDesign = designToken.join('\n');
  fileName = `_token${figmaComponent}.scss`;
  console.log(baseDesign);

  loadDiv.classList.add('btn-loading-hide');
  download(baseDesign, fileName, 'text/x-scss');
}

generateJSON.onclick = function () {
  let checkInput = checkingFields();

  if (checkInput) {
    console.log('berhasil');
    getStylesArtboard(figmaApiToken, figmaProjectId);
    loadDiv.classList.remove('btn-loading-hide');
  } else {
    console.log('Check Fields');
  }
};
