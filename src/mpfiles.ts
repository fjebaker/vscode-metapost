function processContent(content: string) {
    return content.replace(
        /outputtemplate:?=.*;/,
        "outputtemplate:=(\"tmp_fig_%c.\" & outputformat);"
    ).replace(
        /outputformat:?=\"[\w\d]+\";/, 
        "outputformat:=\"svg\";"
        
    );
}


export { processContent }; 