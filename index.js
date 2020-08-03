const axios = require('axios');
const qs = require('querystring')
const fs = require("fs")
const cheerio = require('cheerio');
const mysql = require('mysql');
const utf8 = require('utf8');

const con = mysql.createConnection({
  host: "portal.cm6lwvfby75t.us-east-2.rds.amazonaws.com",
  user: "artmed_idc",
  password: "Artpan01@",
  database: "artmed_idc"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

const page = parseInt(fs.readFileSync("paginacao.txt"))
console.log("=============INÍCIO=================")
console.log(`Páginação inicial: ${page}`)
const qtdRegistros = 150
const url = 'http://www.anvisa.gov.br/datavisa/fila_bula/frmResultado.asp';
const data = {
              hddPageSize: qtdRegistros,
              hddPageAbsolute: page,
              hddSortBy: "asc",
              hddOrderBy: "medicamento"
            };



axios.post(url, qs.stringify(data), 
{ headers: { 
  'Content-Type': 'application/x-www-form-urlencoded' 
  } 
})
.then(function (response) {
  parseDados( response.data, escreverNoArquivo )
})
.catch(function (error) {
   console.log(error);
});


function parseDados( dados, callback ){
  
  //console.log(dados);
  const bulas = []
  let total = 0
  const $ = cheerio.load(dados)
  const tabela = $('#tblResultado').find('tbody')
  const tabela1 = $(tabela[0]).children()
  tabela1.each((i, item) => {  
    
    let etr = $(item)
    let data = etr.children()

    htmlLink1 = $(data[4]).html()
    re = new RegExp(/fVisualizarBula\((\D*?)(\d*)(\D*?),(\D*?)(\d*)(\D*?)\)/);
    let r  = htmlLink1.match(re);
    let nuTransacao = ''
    let bulaPac = ''
    let bulaProf = ''
    if (r) {
        nuTransacao = r[2]
        bulaPac = r[5]
    } 	
    htmlLink2 = $(data[5]).html()
    re = new RegExp(/fVisualizarBula\((\D*?)(\d*)(\D*?),(\D*?)(\d*)(\D*?)\)/);
    let r2  = htmlLink2.match(re);
    if (r2) {
      bulaProf = r2[5]
    }
    
    const bula = {
      medicamento:  $(data[0]).text().trim(),
      empresa: $(data[1]).text().trim(),
      expediente: $(data[2]).text().trim(),
      data_publicacao: $(data[3]).text().trim(),
      nuTransacao: nuTransacao,
      bula_paciente: bulaPac,
      bula_profissional: bulaProf
    }
    bulas.push(bula)

  })
  return callback(bulas)  
}

function escreverNoArquivo(bulas){
  console.log(`total de bulas: ${bulas.length}`);
  let totalRetornardo = bulas.length

  let str = JSON.stringify(bulas);

  fs.writeFile(`bula${page}.txt`, str, err=>{
    if(err) throw err
  })

  console.log(`Próxima pagina: ${page+1}`)
  let pg = (totalRetornardo == qtdRegistros)? page+1 : 1;
  fs.writeFile("paginacao.txt", pg, err=>{
    if(err) throw err 
  })
  let count = 0;
  for( var i in bulas ) {

    

    //let medicamento = bulas[i].medicamento
    let medicamento = bulas[i].medicamento.replace("'", "")
    //let empresa = bulas[i].empresa
    let empresa = bulas[i].empresa.replace("'", "")
    let expediente = bulas[i].expediente
    let nuTransacao = bulas[i].nuTransacao
    let bula_paciente = bulas[i].bula_paciente
    let bula_profissional = bulas[i].bula_profissional

    let data = bulas[i].data_publicacao
    let dia = parseInt(data.substr(0,2))
    let mes = parseInt(data.substr(3,2))
    let ano = parseInt(data.substr(6,4))			
    let data_publicacao = ano+'-'+mes+'-'+dia
    //console.log(data_publicacao);

    let sql = `INSERT INTO bula 
            (medicamento, empresa, expediente, data_publicacao, nuTransacao, bula_paciente, bula_profissional, data) 
            VALUES ( 
              '${medicamento}', 
              '${empresa}', 
              '${expediente}', 
              '${data_publicacao}', 
              '${nuTransacao}', 
              '${bula_paciente}', 
              '${bula_profissional}', 
              NOW()
            )
            ON DUPLICATE KEY UPDATE
              medicamento = '${medicamento}',
              empresa = '${empresa}',
              expediente = '${expediente}',
              data_publicacao = '${data_publicacao}',
              nuTransacao = '${nuTransacao}',
              bula_paciente = '${bula_paciente}',
              bula_profissional = '${bula_profissional}',
              data = NOW()`;

    con.query(sql, function (err, result) {
        if (err) throw err;
        count++;
        console.log(`${count} registros inseridos`);
    });

  }
  console.log("===============FIM==================")
  con.end();
}