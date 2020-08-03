const axios = require('axios');
const qs = require('querystring')
const fs = require("fs")
const cheerio = require('cheerio')
const mysql = require('mysql')
const Iconv = require('iconv').Iconv;

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
const qtdRegistros = 5
const url = 'http://www.anvisa.gov.br/datavisa/fila_bula/frmResultado.asp';
const data = {
              hddPageSize: qtdRegistros,
              hddPageAbsolute: page,
              hddSortBy: "asc",
              hddOrderBy: "medicamento"
            };

let bulas = [{"medicamento":"A SA�DE DA MULHER","empresa":"EMS S/A","expediente":"0500912/14-0","data_publicacao":"25/06/2014","nuTransacao":"5382372014","bula_paciente":"2111405","bula_profissional":"2111416"},{"medicamento":"AAS","empresa":"SANOFI MEDLEY FARMAC�UTICA LTDA.","expediente":"3480770/19-5","data_publicacao":"17/12/2019","nuTransacao":"16186682019","bula_paciente":"11804471","bula_profissional":"11804472"},{"medicamento":"AAS PROTECT","empresa":"SANOFI MEDLEY FARMAC�UTICA LTDA.","expediente":"3609392/19-1","data_publicacao":"30/12/2019","nuTransacao":"16475362019","bula_paciente":"11842900","bula_profissional":"11842901"},{"medicamento":"ABC","empresa":"KLEY HERTZ FARMACEUTICA S.A","expediente":"3189540/19-9","data_publicacao":"19/11/2019","nuTransacao":"13935172019","bula_paciente":"11712559","bula_profissional":"11712561"},{"medicamento":"ABCLER ABNAT","empresa":"AIRELA IND�STRIA FARMAC�UTICA LTDA.","expediente":"0247514/19-6","data_publicacao":"19/03/2019","nuTransacao":"2520442019","bula_paciente":"11088794","bula_profissional":"11088795"}]
escreverNoArquivo(bulas);
/*
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
*/

function parseDados( dados, callback ){
  
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
  const iconv = new Iconv('latin1', 'UTF-8')
  for( var i in bulas ) {
    //let medicamento = bulas[i].medicamento    
    let medicamento = iconv.convert(bulas[i].medicamento).toString()
    let empresa = bulas[i].empresa
    let expediente = bulas[i].expediente
    let nuTransacao = bulas[i].nuTransacao
    let bula_paciente = bulas[i].bula_paciente
    let bula_profissional = bulas[i].bula_profissional

    let data = bulas[i].data_publicacao
	let dia = parseInt(data.substr(0,2))
	let mes = parseInt(data.substr(3,2))
	let ano = parseInt(data.substr(6,4))			
	let data_publicacao = ano+'-'+mes+'-'+dia
	console.log(medicamento);

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
        console.log("1 record inserted");
    });
    console.log(sql)
  }
  console.log("===============FIM==================")
  con.end();
}