tenemos que implementar estas modificaciones importantes de forma completa en este repositorio:

- tiene que haber una tabla que aloje los items SEPA. son de un dataset regulado de productos de Argentina. esta tabla no tendrá business id pero si los mismos campos que la tabla items. pero no estarán asociadas a ningún negocio. en los negocios ahora debe haber una variable en Settings que de activarla, el negocio va a poder ver y usar, aparte de sus Items, los items de SEPA. aplicarlo en todo el sistema, de manera optimizada ya que SEPA puede alojar mas de 200mil registros, siempre que se hace una query o consulta a items, si tiene activada la variable debe traerlos también, por supuesto implementar páginaciones o cargar progresivas necesarias para la cantidad masiva.

- estos items SEPA lo único que puede editarle el negocio es el precio final, todo lo otro debe estar bloqueado. para esto, debe haber una tabla que aloje solo los precios editados de cada id SEPA si es los hay para cada negocio, para usar ese, si no está modificado por el negocio usa el original de la tabla SEPA.

- los items SEPA deben estar indexados por el código de barras como identificador único obligatorio.

- agregar también un filtro en el listado de Items para mostrar solo los de SEPA que le modifiqué el precio.

- debe haber un cron diario complejo, que corra a las 4am y que según el día de la semana que sea ingrese a estas diferentes urls:

LUNES: https://datos.produccion.gob.ar/dataset/6f47ec76-d1ce-4e34-a7e1-621fe9b1d0b5/resource/0a9069a9-06e8-4f98-874d-da5578693290/download/sepa_lunes.zip
MARTES: https://datos.produccion.gob.ar/dataset/6f47ec76-d1ce-4e34-a7e1-621fe9b1d0b5/resource/9dc06241-cc83-44f4-8e25-c9b1636b8bc8/download/sepa_martes.zip
MIERCOLES: https://datos.produccion.gob.ar/dataset/6f47ec76-d1ce-4e34-a7e1-621fe9b1d0b5/resource/1e92cd42-4f94-4071-a165-62c4cb2ce23c/download/sepa_miercoles.zip
JUEVES: https://datos.produccion.gob.ar/dataset/6f47ec76-d1ce-4e34-a7e1-621fe9b1d0b5/resource/d076720f-a7f0-4af8-b1d6-1b99d5a90c14/download/sepa_jueves.zip
VIERNES: https://datos.produccion.gob.ar/dataset/6f47ec76-d1ce-4e34-a7e1-621fe9b1d0b5/resource/91bc072a-4726-44a1-85ec-4a8467aad27e/download/sepa_viernes.zip
SABADO: https://datos.produccion.gob.ar/dataset/6f47ec76-d1ce-4e34-a7e1-621fe9b1d0b5/resource/b3c3da5d-213d-41e7-8d74-f23fda0a3c30/download/sepa_sabado.zip
DOMINGO: https://datos.produccion.gob.ar/dataset/6f47ec76-d1ce-4e34-a7e1-621fe9b1d0b5/resource/f8e75128-515a-436e-bf8d-5c63a62f2005/download/sepa_domingo.zip

el proceso debe extraer el .zip del día y dentro habrá una carpeta con una fecha como nombre, por ejemplo '2026-02-16' no importa la fecha que sea debe abrir la carpeta y dentro vendrán más .zip por ejemplo:

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----         16/2/2026     15:30        7994561 sepa_1_comercio-sepa-12_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30       16534974 sepa_1_comercio-sepa-13_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30       88573667 sepa_1_comercio-sepa-15_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30        3451024 sepa_1_comercio-sepa-16_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30         200884 sepa_1_comercio-sepa-19_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30        2474513 sepa_1_comercio-sepa-21_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30          43949 sepa_1_comercio-sepa-23_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30         494841 sepa_1_comercio-sepa-47_2026-02-16_09-05-11.zip        
-a----         16/2/2026     15:30         965882 sepa_1_comercio-sepa-8_2026-02-16_09-05-11.zip
-a----         16/2/2026     15:30        7521191 sepa_1_comercio-sepa-9_2026-02-16_09-05-11.zip
-a----         16/2/2026     15:30      130483321 sepa_2_comercio-sepa-10_2026-02-16_01-05-07.zip        
-a----         16/2/2026     15:30       45941724 sepa_2_comercio-sepa-11_2026-02-16_01-05-07.zip        
-a----         16/2/2026     15:30       19430807 sepa_2_comercio-sepa-2_2026-02-16_01-05-07.zip
-a----         16/2/2026     15:30           1544 sepa_2_comercio-sepa-36_2026-02-16_01-05-07.zip        
-a----         16/2/2026     15:30         125288 sepa_2_comercio-sepa-5_2026-02-16_01-05-07.zip
-a----         16/2/2026     15:30         540133 sepa_2_comercio-sepa-6_2026-02-16_01-05-07.zip

debe ordenarlos de menor peso a mayor, y por cada .zip iterar y hacer lo siguiente:

lo extraerá, y dentro tendrá una carpeta con el mismo nombre, ejemplo 'sepa_1_comercio-sepa-8_2026-02-16_09-05-11'

dentro de esa carpeta siempre tendrá estos tres .csv

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----         16/2/2026     15:40            654 comercio.csv
-a----         16/2/2026     15:40            454 productos.csv
-a----         16/2/2026     15:40           2129 sucursales.csv

debe usar únicamente 'productos.csv', el cual tiene una estructura como esta:

id_comercio|id_bandera|id_sucursal|id_producto|productos_ean|productos_descripcion|productos_cantidad_presentacion|productos_unidad_medida_presentacion|productos_marca|productos_precio_lista|productos_precio_referencia|productos_cantidad_referencia|productos_unidad_medida_referencia|productos_precio_unitario_promo1|productos_leyenda_promo1|productos_precio_unitario_promo2|productos_leyenda_promo2
8|1|1|7790010002479|1|ACOND.JOHNSON'S GOTAS DE BRILLO 400ml|400|ml|JOHNSONS &JOHNSONS|8669|21672.5|0.4|Precio x 1000 ml||||
8|1|1|7790010003223|1|ACOND.JOHNSON'S GOTAS DE BRILLO 400ml|400|ml|JOHNSONS &JOHNSONS|8669|21672.5|0.4|Precio x 1000 ml||||
8|1|1|7790010002394|1|SHAMPOO JOHNSON'S MANZANILLA 400 cc.|400|cc|JOHNSONS &JOHNSONS|10199|25497.5|0.4|Precio x 1000 cc||||
8|1|1|7790010003070|1|SHAMPOO JOHNSON'S MANZANILLA 400 cc.|400|cc|JOHNSONS &JOHNSONS|10199|25497.5|0.4|Precio x 1000 cc||||

debe interpretar el csv, y por cada fila válida insertar en la tabla de SEPA, si el registro ya está (código de barras existe) debe updatear el registro para actualizar sus campos. esto debe estar hecho de manera robusta, ya que puede haber 150mil registros por ejemplo, debe evitar filas incompatibles e ir armando una cola con todos los cambios en la base de datos. debe normalizar los campos para que quede correcto en la db.

el proceso también debe tener alguna manera de correrlo manualmente pudiendo elegir qué día correr, para que pueda testearlo o también correrlo si estuvo el cron apagado.

- implementa todos los cambios necesarios de punta a punta, modificando el backend y el frontend para dar con el requerimiento.

